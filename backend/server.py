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
        if 'created_at' in data and isinstance(data['created_at'], datetime):
            data['created_at'] = data['created_at'].isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        if 'tournament_date' in item and isinstance(item['tournament_date'], str):
            item['tournament_date'] = datetime.fromisoformat(item['tournament_date']).date()
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
    davis_cup_match_number: Optional[int] = None  # 1, 2, or 3 for Davis Cup
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentCreate(BaseModel):
    name: str
    category: TournamentCategory
    surface: Surface
    real_location: str
    fictional_location: str
    tournament_date: date
    davis_cup_match_number: Optional[int] = None  # 1, 2, or 3 for Davis Cup

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
    duration_minutes: int  # Duration in minutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchCreate(BaseModel):
    tournament_id: str
    player1_id: str
    player2_id: str
    winner_id: str
    sets: List[SetResult]
    duration_minutes: int  # Duration in minutes

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
    
    # Handle Copa Davis special logic
    if input.category == TournamentCategory.COPA_DAVIS:
        if input.davis_cup_match_number == 3:  # Decisive match
            tournament_dict['is_best_of_five'] = True
        else:  # Matches 1 and 2
            tournament_dict['is_best_of_five'] = False
    else:
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
    
    # Handle Copa Davis special logic
    if input.category == TournamentCategory.COPA_DAVIS:
        if input.davis_cup_match_number == 3:  # Decisive match
            tournament_dict['is_best_of_five'] = True
        else:  # Matches 1 and 2
            tournament_dict['is_best_of_five'] = False
    else:
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
    total_duration = sum([m.get("duration_minutes", 0) for m in matches])
    
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
        "supertiebreaks_won_percentage": round((total_supertiebreaks_won / total_supertiebreaks_played * 100) if total_supertiebreaks_played > 0 else 0, 2),
        "total_duration_minutes": total_duration,
        "total_duration_hours": round(total_duration / 60, 2),
        "average_match_duration_minutes": round(total_duration / total_matches) if total_matches > 0 else 0
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
        total_surface_duration = sum([m.get("duration_minutes", 0) for m in surface_matches])
        
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
            "supertiebreaks_won_percentage": round((total_supertiebreaks_won / total_supertiebreaks_played * 100) if total_supertiebreaks_played > 0 else 0, 2),
            "total_duration_minutes": total_surface_duration,
            "total_duration_hours": round(total_surface_duration / 60, 2),
            "average_match_duration_minutes": round(total_surface_duration / total_matches) if total_matches > 0 else 0,
            "average_minutes_per_set": round(total_surface_duration / total_sets_played) if total_sets_played > 0 else 0
        }
    
    return surface_stats

@api_router.get("/stats/records")
async def get_match_records():
    # Get all matches and tournaments
    matches = await db.matches.find().to_list(1000)
    tournaments = await db.tournaments.find().to_list(1000)
    players = await db.players.find().to_list(1000)
    
    tournament_map = {t["id"]: t for t in tournaments}
    player_map = {p["id"]: p for p in players}
    
    if not matches:
        return {}
    
    records = {}
    
    # 1. MAYOR PALIZA - Least games lost, shortest duration, biggest set difference
    biggest_beatdown = None
    min_beating_score = float('inf')
    
    for match in matches:
        if not match.get("duration_minutes"):
            continue
            
        # Calculate games differential and dominance
        winner_games = 0
        loser_games = 0
        sets_won = 0
        sets_lost = 0
        
        for set_result in match["sets"]:
            p1_games = set_result["player1_games"]
            p2_games = set_result["player2_games"]
            
            if p1_games > p2_games:
                if match["winner_id"] == match["player1_id"]:
                    winner_games += p1_games
                    loser_games += p2_games
                    sets_won += 1
                else:
                    winner_games += p2_games
                    loser_games += p1_games
                    sets_lost += 1
            else:
                if match["winner_id"] == match["player2_id"]:
                    winner_games += p2_games
                    loser_games += p1_games
                    sets_won += 1
                else:
                    winner_games += p1_games
                    loser_games += p2_games
                    sets_lost += 1
        
        # Beatdown score: lower is more dominant (considers games ratio, duration, sets)
        games_ratio = loser_games / winner_games if winner_games > 0 else 1
        duration_factor = match["duration_minutes"] / 60  # Convert to hours
        set_dominance = sets_won / (sets_won + sets_lost) if (sets_won + sets_lost) > 0 else 0
        
        beatdown_score = games_ratio * duration_factor * (2 - set_dominance)
        
        if beatdown_score < min_beating_score:
            min_beating_score = beatdown_score
            biggest_beatdown = {
                "match": match,
                "winner_games": winner_games,
                "loser_games": loser_games,
                "sets_won": sets_won,
                "sets_lost": sets_lost,
                "duration_minutes": match["duration_minutes"]
            }
    
    # 2. PARTIDO MÁS LARGO
    longest_match = max(matches, key=lambda x: x.get("duration_minutes", 0))
    
    # 3. PARTIDO MÁS ÉPICO - Most sets + longest duration combination
    most_epic = None
    max_epic_score = 0
    
    for match in matches:
        if not match.get("duration_minutes"):
            continue
            
        sets_count = len(match["sets"])
        duration_hours = match["duration_minutes"] / 60
        
        # Count tiebreaks and supertiebreaks for drama
        tiebreaks = sum(1 for s in match["sets"] if s.get("tiebreak_p1") is not None)
        supertiebreaks = sum(1 for s in match["sets"] if s.get("supertiebreak_p1") is not None)
        
        # Epic score: more sets, longer duration, more tiebreaks = more epic
        epic_score = sets_count * duration_hours * (1 + tiebreaks * 0.5 + supertiebreaks * 1)
        
        if epic_score > max_epic_score:
            max_epic_score = epic_score
            most_epic = match
    
    # 4. PARTIDO CON MÁS TIEBREAKS
    most_tiebreaks = None
    max_tiebreaks = 0
    
    for match in matches:
        tiebreaks = sum(1 for s in match["sets"] if s.get("tiebreak_p1") is not None)
        supertiebreaks = sum(1 for s in match["sets"] if s.get("supertiebreak_p1") is not None)
        total_breakers = tiebreaks + supertiebreaks
        
        if total_breakers > max_tiebreaks:
            max_tiebreaks = total_breakers
            most_tiebreaks = {
                "match": match,
                "tiebreaks": tiebreaks,
                "supertiebreaks": supertiebreaks,
                "total_breakers": total_breakers
            }
    
    # 5. SUPERFICIE FAVORITA DE CADA JUGADOR
    favorite_surfaces = {}
    
    for player in players:
        player_id = player["id"]
        surface_records = {}
        
        # Get tournaments and their surfaces
        for tournament in tournaments:
            surface = tournament["surface"]
            if surface not in surface_records:
                surface_records[surface] = {"wins": 0, "total": 0}
        
        # Count matches per surface
        player_matches = [m for m in matches if m["player1_id"] == player_id or m["player2_id"] == player_id]
        
        for match in player_matches:
            tournament = tournament_map.get(match["tournament_id"])
            if tournament:
                surface = tournament["surface"]
                if surface not in surface_records:
                    surface_records[surface] = {"wins": 0, "total": 0}
                
                surface_records[surface]["total"] += 1
                if match["winner_id"] == player_id:
                    surface_records[surface]["wins"] += 1
        
        # Find favorite surface (best win rate with at least 1 match)
        best_surface = None
        best_rate = -1
        
        for surface, record in surface_records.items():
            if record["total"] > 0:
                win_rate = record["wins"] / record["total"]
                if win_rate > best_rate:
                    best_rate = win_rate
                    best_surface = {
                        "surface": surface,
                        "wins": record["wins"],
                        "total": record["total"],
                        "percentage": round(win_rate * 100, 1)
                    }
        
        if best_surface:
            favorite_surfaces[player_id] = best_surface
    
    # Format results
    def format_match_info(match_data):
        if isinstance(match_data, dict) and "match" in match_data:
            match = match_data["match"]
        else:
            match = match_data
            
        tournament = tournament_map.get(match["tournament_id"])
        player1 = player_map.get(match["player1_id"])
        player2 = player_map.get(match["player2_id"])
        winner = player_map.get(match["winner_id"])
        
        return {
            "tournament_name": tournament["name"] if tournament else "Unknown",
            "surface": tournament["surface"] if tournament else "Unknown",
            "player1_name": player1["name"] if player1 else "Unknown",
            "player2_name": player2["name"] if player2 else "Unknown",
            "winner_name": winner["name"] if winner else "Unknown",
            "duration_minutes": match.get("duration_minutes", 0),
            "duration_formatted": f"{match.get('duration_minutes', 0) // 60}h {match.get('duration_minutes', 0) % 60}min",
            "sets": match["sets"],
            "date": tournament["tournament_date"] if tournament else None
        }
    
    if biggest_beatdown:
        records["biggest_beatdown"] = {
            **format_match_info(biggest_beatdown["match"]),
            "winner_games": biggest_beatdown["winner_games"],
            "loser_games": biggest_beatdown["loser_games"],
            "games_differential": biggest_beatdown["winner_games"] - biggest_beatdown["loser_games"]
        }
    else:
        records["biggest_beatdown"] = None
    
    records["longest_match"] = format_match_info(longest_match) if longest_match else None
    
    records["most_epic"] = format_match_info(most_epic) if most_epic else None
    
    records["most_tiebreaks"] = {
        **format_match_info(most_tiebreaks["match"]) if most_tiebreaks else {},
        "tiebreaks": most_tiebreaks["tiebreaks"] if most_tiebreaks else 0,
        "supertiebreaks": most_tiebreaks["supertiebreaks"] if most_tiebreaks else 0,
        "total_breakers": most_tiebreaks["total_breakers"] if most_tiebreaks else 0
    } if most_tiebreaks else None
    
    records["favorite_surfaces"] = {}
    for player_id, surface_info in favorite_surfaces.items():
        player = player_map.get(player_id)
        if player:
            records["favorite_surfaces"][player["name"]] = surface_info
    
    return records

@api_router.get("/stats/tournament-category/{player_id}")
async def get_tournament_category_stats(player_id: str):
    # Get all matches for player
    matches = await db.matches.find({"$or": [{"player1_id": player_id}, {"player2_id": player_id}]}).to_list(1000)
    
    # Get tournaments to get category info
    tournament_ids = [m["tournament_id"] for m in matches]
    tournaments = await db.tournaments.find({"id": {"$in": tournament_ids}}).to_list(1000)
    tournament_categories = {t["id"]: t["category"] for t in tournaments}
    
    category_stats = {}
    
    for category in TournamentCategory:
        category_matches = [m for m in matches if tournament_categories.get(m["tournament_id"]) == category.value]
        
        total_matches = len(category_matches)
        matches_won = len([m for m in category_matches if m["winner_id"] == player_id])
        total_category_duration = sum([m.get("duration_minutes", 0) for m in category_matches])
        
        total_sets_won = 0
        total_sets_played = 0
        
        for match in category_matches:
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
        
        category_stats[category.value] = {
            "matches_played": total_matches,
            "matches_won": matches_won,
            "matches_won_percentage": round((matches_won / total_matches * 100) if total_matches > 0 else 0, 2),
            "sets_played": total_sets_played,
            "sets_won": total_sets_won,
            "sets_won_percentage": round((total_sets_won / total_sets_played * 100) if total_sets_played > 0 else 0, 2),
            "total_duration_minutes": total_category_duration,
            "total_duration_hours": round(total_category_duration / 60, 2),
            "average_match_duration_minutes": round(total_category_duration / total_matches) if total_matches > 0 else 0,
            "average_sets_per_match": round(total_sets_played / total_matches, 2) if total_matches > 0 else 0,
            "average_minutes_per_set": round(total_category_duration / total_sets_played) if total_sets_played > 0 else 0
        }
    
    return category_stats

@api_router.get("/davis-cup/winner/{player_id}")
async def get_davis_cup_wins(player_id: str):
    # Get all Davis Cup matches for this player
    davis_tournaments = await db.tournaments.find({"category": "Copa Davis"}).to_list(1000)
    davis_tournament_ids = [t["id"] for t in davis_tournaments]
    
    davis_matches = await db.matches.find({
        "tournament_id": {"$in": davis_tournament_ids},
        "$or": [{"player1_id": player_id}, {"player2_id": player_id}]
    }).to_list(1000)
    
    # Group matches by tournament to count wins per Davis Cup
    davis_cups = {}
    for match in davis_matches:
        tournament_id = match["tournament_id"]
        if tournament_id not in davis_cups:
            davis_cups[tournament_id] = {"wins": 0, "total": 0}
        
        davis_cups[tournament_id]["total"] += 1
        if match["winner_id"] == player_id:
            davis_cups[tournament_id]["wins"] += 1
    
    # Count how many Davis Cups this player won (won 2 out of 3 matches)
    davis_cup_victories = 0
    for tournament_id, stats in davis_cups.items():
        if stats["wins"] >= 2:  # Won at least 2 out of 3 matches
            davis_cup_victories += 1
    
    return {
        "player_id": player_id,
        "davis_cup_victories": davis_cup_victories,
        "has_davis_cup_badge": davis_cup_victories > 0
    }

@api_router.get("/cleanup")
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