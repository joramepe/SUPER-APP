from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, date
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class TournamentCategory(str, Enum):
    GRAND_SLAM = "Grand Slam"
    MASTERS_1000 = "Masters 1000"
    MASTERS_500 = "Masters 500"
    ATP_FINALS = "ATP Finals"
    COPA_DAVIS = "Copa Davis"

class Surface(str, Enum):
    HIERBA = "Hierba"
    DURA = "Dura"
    TIERRA = "Tierra"
    DURA_INDOOR = "Dura Indoor"

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        if 'tournament_date' in data and isinstance(data['tournament_date'], date):
            data['tournament_date'] = data['tournament_date'].isoformat()
        if 'match_date' in data and isinstance(data['match_date'], date):
            data['match_date'] = data['match_date'].isoformat()
        if 'created_at' in data and isinstance(data['created_at'], datetime):
            data['created_at'] = data['created_at'].isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        if 'tournament_date' in item and isinstance(item['tournament_date'], str):
            item['tournament_date'] = datetime.fromisoformat(item['tournament_date']).date()
        if 'match_date' in item and isinstance(item['match_date'], str):
            item['match_date'] = datetime.fromisoformat(item['match_date']).date()
        if 'created_at' in item and isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

# Models
class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlayerCreate(BaseModel):
    name: str

class Tournament(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: TournamentCategory
    surface: Surface
    real_location: str
    fictional_location: str
    tournament_date: date
    points: int
    is_best_of_five: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentCreate(BaseModel):
    name: str
    category: TournamentCategory
    surface: Surface
    real_location: str
    fictional_location: str
    tournament_date: date

class SetResult(BaseModel):
    player1_games: int
    player2_games: int
    tiebreak_p1: Optional[int] = None
    tiebreak_p2: Optional[int] = None
    supertiebreak_p1: Optional[int] = None
    supertiebreak_p2: Optional[int] = None

class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tournament_id: str
    player1_id: str
    player2_id: str
    winner_id: str
    sets: List[SetResult]
    match_date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchCreate(BaseModel):
    tournament_id: str
    player1_id: str
    player2_id: str
    winner_id: str
    sets: List[SetResult]
    match_date: date

# Tournament points mapping
TOURNAMENT_POINTS = {
    TournamentCategory.GRAND_SLAM: 2000,
    TournamentCategory.MASTERS_1000: 1000,
    TournamentCategory.MASTERS_500: 500,
    TournamentCategory.ATP_FINALS: 1500,
    TournamentCategory.COPA_DAVIS: 0  # Special case
}

# Tournament best of five mapping
BEST_OF_FIVE = {
    TournamentCategory.GRAND_SLAM: True,
    TournamentCategory.MASTERS_1000: False,
    TournamentCategory.MASTERS_500: False,
    TournamentCategory.ATP_FINALS: False,
    TournamentCategory.COPA_DAVIS: False  # Variable, will be set per tournament
}

# Player routes
@api_router.post("/players", response_model=Player)
async def create_player(input: PlayerCreate):
    player_dict = input.dict()
    player_obj = Player(**player_dict)
    await db.players.insert_one(prepare_for_mongo(player_obj.dict()))
    return player_obj

@api_router.get("/players", response_model=List[Player])
async def get_players():
    players = await db.players.find().to_list(1000)
    return [Player(**parse_from_mongo(player)) for player in players]

# Tournament routes
@api_router.post("/tournaments", response_model=Tournament)
async def create_tournament(input: TournamentCreate):
    tournament_dict = input.dict()
    tournament_dict['points'] = TOURNAMENT_POINTS[input.category]
    tournament_dict['is_best_of_five'] = BEST_OF_FIVE[input.category]
    tournament_obj = Tournament(**tournament_dict)
    await db.tournaments.insert_one(prepare_for_mongo(tournament_obj.dict()))
    return tournament_obj

@api_router.get("/tournaments", response_model=List[Tournament])
async def get_tournaments():
    tournaments = await db.tournaments.find().to_list(1000)
    return [Tournament(**parse_from_mongo(tournament)) for tournament in tournaments]

@api_router.get("/tournaments/{tournament_id}", response_model=Tournament)
async def get_tournament(tournament_id: str):
    tournament = await db.tournaments.find_one({"id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return Tournament(**parse_from_mongo(tournament))

@api_router.put("/tournaments/{tournament_id}", response_model=Tournament)
async def update_tournament(tournament_id: str, input: TournamentCreate):
    tournament_dict = input.dict()
    tournament_dict['points'] = TOURNAMENT_POINTS[input.category]
    tournament_dict['is_best_of_five'] = BEST_OF_FIVE[input.category]
    
    result = await db.tournaments.update_one(
        {"id": tournament_id}, 
        {"$set": prepare_for_mongo(tournament_dict)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    
    updated_tournament = await db.tournaments.find_one({"id": tournament_id})
    return Tournament(**parse_from_mongo(updated_tournament))

@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str):
    result = await db.tournaments.delete_one({"id": tournament_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return {"message": "Torneo eliminado correctamente"}

# Match routes
@api_router.post("/matches", response_model=Match)
async def create_match(input: MatchCreate):
    match_dict = input.dict()
    match_obj = Match(**match_dict)
    await db.matches.insert_one(prepare_for_mongo(match_obj.dict()))
    return match_obj

@api_router.get("/matches", response_model=List[Match])
async def get_matches():
    matches = await db.matches.find().to_list(1000)
    return [Match(**parse_from_mongo(match)) for match in matches]

@api_router.get("/matches/{match_id}", response_model=Match)
async def get_match(match_id: str):
    match = await db.matches.find_one({"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return Match(**parse_from_mongo(match))

@api_router.put("/matches/{match_id}", response_model=Match)
async def update_match(match_id: str, input: MatchCreate):
    result = await db.matches.update_one(
        {"id": match_id}, 
        {"$set": prepare_for_mongo(input.dict())}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    updated_match = await db.matches.find_one({"id": match_id})
    return Match(**parse_from_mongo(updated_match))

@api_router.delete("/matches/{match_id}")
async def delete_match(match_id: str):
    result = await db.matches.delete_one({"id": match_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return {"message": "Partido eliminado correctamente"}

# Statistics routes
@api_router.get("/stats/overall/{player_id}")
async def get_overall_stats(player_id: str):
    matches = await db.matches.find({"$or": [{"player1_id": player_id}, {"player2_id": player_id}]}).to_list(1000)
    
    total_matches = len(matches)
    matches_won = len([m for m in matches if m["winner_id"] == player_id])
    
    total_sets_won = 0
    total_sets_played = 0
    total_tiebreaks_won = 0
    total_tiebreaks_played = 0
    total_supertiebreaks_won = 0
    total_supertiebreaks_played = 0
    
    for match in matches:
        for set_result in match["sets"]:
            total_sets_played += 1
            
            # Determine set winner
            p1_games = set_result["player1_games"]
            p2_games = set_result["player2_games"]
            
            if p1_games > p2_games:
                set_winner = match["player1_id"]
            else:
                set_winner = match["player2_id"]
            
            if set_winner == player_id:
                total_sets_won += 1
            
            # Tiebreaks
            if set_result.get("tiebreak_p1") is not None:
                total_tiebreaks_played += 1
                tb_p1 = set_result["tiebreak_p1"]
                tb_p2 = set_result["tiebreak_p2"]
                
                if tb_p1 > tb_p2:
                    tb_winner = match["player1_id"]
                else:
                    tb_winner = match["player2_id"]
                
                if tb_winner == player_id:
                    total_tiebreaks_won += 1
            
            # Supertiebreaks
            if set_result.get("supertiebreak_p1") is not None:
                total_supertiebreaks_played += 1
                stb_p1 = set_result["supertiebreak_p1"]
                stb_p2 = set_result["supertiebreak_p2"]
                
                if stb_p1 > stb_p2:
                    stb_winner = match["player1_id"]
                else:
                    stb_winner = match["player2_id"]
                
                if stb_winner == player_id:
                    total_supertiebreaks_won += 1
    
    return {
        "matches_played": total_matches,
        "matches_won": matches_won,
        "matches_won_percentage": round((matches_won / total_matches * 100) if total_matches > 0 else 0, 2),
        "sets_played": total_sets_played,
        "sets_won": total_sets_won,
        "sets_won_percentage": round((total_sets_won / total_sets_played * 100) if total_sets_played > 0 else 0, 2),
        "tiebreaks_played": total_tiebreaks_played,
        "tiebreaks_won": total_tiebreaks_won,
        "tiebreaks_won_percentage": round((total_tiebreaks_won / total_tiebreaks_played * 100) if total_tiebreaks_played > 0 else 0, 2),
        "supertiebreaks_played": total_supertiebreaks_played,
        "supertiebreaks_won": total_supertiebreaks_won,
        "supertiebreaks_won_percentage": round((total_supertiebreaks_won / total_supertiebreaks_played * 100) if total_supertiebreaks_played > 0 else 0, 2)
    }

@api_router.get("/stats/surface/{player_id}")
async def get_surface_stats(player_id: str):
    # Get all matches for player
    matches = await db.matches.find({"$or": [{"player1_id": player_id}, {"player2_id": player_id}]}).to_list(1000)
    
    # Get tournaments to get surface info
    tournament_ids = [m["tournament_id"] for m in matches]
    tournaments = await db.tournaments.find({"id": {"$in": tournament_ids}}).to_list(1000)
    tournament_surfaces = {t["id"]: t["surface"] for t in tournaments}
    
    surface_stats = {}
    
    for surface in Surface:
        surface_matches = [m for m in matches if tournament_surfaces.get(m["tournament_id"]) == surface.value]
        
        total_matches = len(surface_matches)
        matches_won = len([m for m in surface_matches if m["winner_id"] == player_id])
        
        total_sets_won = 0
        total_sets_played = 0
        total_tiebreaks_won = 0
        total_tiebreaks_played = 0
        total_supertiebreaks_won = 0
        total_supertiebreaks_played = 0
        
        for match in surface_matches:
            for set_result in match["sets"]:
                total_sets_played += 1
                
                p1_games = set_result["player1_games"]
                p2_games = set_result["player2_games"]
                
                if p1_games > p2_games:
                    set_winner = match["player1_id"]
                else:
                    set_winner = match["player2_id"]
                
                if set_winner == player_id:
                    total_sets_won += 1
                
                # Tiebreaks
                if set_result.get("tiebreak_p1") is not None:
                    total_tiebreaks_played += 1
                    tb_p1 = set_result["tiebreak_p1"]
                    tb_p2 = set_result["tiebreak_p2"]
                    
                    if tb_p1 > tb_p2:
                        tb_winner = match["player1_id"]
                    else:
                        tb_winner = match["player2_id"]
                    
                    if tb_winner == player_id:
                        total_tiebreaks_won += 1
                
                # Supertiebreaks
                if set_result.get("supertiebreak_p1") is not None:
                    total_supertiebreaks_played += 1
                    stb_p1 = set_result["supertiebreak_p1"]
                    stb_p2 = set_result["supertiebreak_p2"]
                    
                    if stb_p1 > stb_p2:
                        stb_winner = match["player1_id"]
                    else:
                        stb_winner = match["player2_id"]
                    
                    if stb_winner == player_id:
                        total_supertiebreaks_won += 1
        
        surface_stats[surface.value] = {
            "matches_played": total_matches,
            "matches_won": matches_won,
            "matches_won_percentage": round((matches_won / total_matches * 100) if total_matches > 0 else 0, 2),
            "sets_played": total_sets_played,
            "sets_won": total_sets_won,
            "sets_won_percentage": round((total_sets_won / total_sets_played * 100) if total_sets_played > 0 else 0, 2),
            "tiebreaks_played": total_tiebreaks_played,
            "tiebreaks_won": total_tiebreaks_won,
            "tiebreaks_won_percentage": round((total_tiebreaks_won / total_tiebreaks_played * 100) if total_tiebreaks_played > 0 else 0, 2),
            "supertiebreaks_played": total_supertiebreaks_played,
            "supertiebreaks_won": total_supertiebreaks_won,
            "supertiebreaks_won_percentage": round((total_supertiebreaks_won / total_supertiebreaks_played * 100) if total_supertiebreaks_played > 0 else 0, 2)
        }
    
    return surface_stats

@api_router.delete("/cleanup")
async def cleanup_database():
    """Clean up all test data from database"""
    try:
        await db.players.delete_many({})
        await db.tournaments.delete_many({})
        await db.matches.delete_many({})
        return {"message": "Base de datos limpiada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ranking")
async def get_current_ranking():
    # Get all players
    players = await db.players.find().to_list(1000)
    
    # Get all matches with tournament info
    matches = await db.matches.find().to_list(1000)
    tournaments = await db.tournaments.find().to_list(1000)
    tournament_points = {t["id"]: t["points"] for t in tournaments}
    
    # Calculate points for each player
    player_points = {}
    for player in players:
        player_points[player["id"]] = 0
    
    for match in matches:
        winner_id = match["winner_id"]
        tournament_id = match["tournament_id"]
        points = tournament_points.get(tournament_id, 0)
        
        if winner_id in player_points:
            player_points[winner_id] += points
    
    # Sort players by points
    ranking = []
    for player in players:
        ranking.append({
            "player_id": player["id"],
            "player_name": player["name"],
            "points": player_points[player["id"]]
        })
    
    ranking.sort(key=lambda x: x["points"], reverse=True)
    
    # Add ranking position
    for i, player in enumerate(ranking):
        player["position"] = i + 1
    
    return ranking

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()