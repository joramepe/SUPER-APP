import requests
import sys
import json
from datetime import datetime, date

class ATPTourAPITester:
    def __init__(self, base_url="https://match-tracker-118.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_players = []
        self.created_tournaments = []
        self.created_matches = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_players_crud(self):
        """Test player CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PLAYER OPERATIONS")
        print("="*50)
        
        # Test creating players
        player1_data = {"name": "Rafael Nadal"}
        success, player1 = self.run_test("Create Player 1", "POST", "players", 200, player1_data)
        if success and 'id' in player1:
            self.created_players.append(player1)
        
        player2_data = {"name": "Novak Djokovic"}
        success, player2 = self.run_test("Create Player 2", "POST", "players", 200, player2_data)
        if success and 'id' in player2:
            self.created_players.append(player2)
        
        # Test getting all players
        success, players = self.run_test("Get All Players", "GET", "players", 200)
        if success:
            print(f"   Found {len(players)} players")
        
        return len(self.created_players) >= 2

    def test_tournaments_crud(self):
        """Test tournament CRUD operations"""
        print("\n" + "="*50)
        print("TESTING TOURNAMENT OPERATIONS")
        print("="*50)
        
        # Test creating tournaments with different categories
        tournaments_data = [
            {
                "name": "Australian Open",
                "category": "Grand Slam",
                "surface": "Dura",
                "real_location": "Melbourne, Australia",
                "fictional_location": "Club Tenis Melbourne",
                "tournament_date": "2024-01-15"
            },
            {
                "name": "Madrid Masters",
                "category": "Masters 1000",
                "surface": "Tierra",
                "real_location": "Madrid, España",
                "fictional_location": "Club Tenis Madrid",
                "tournament_date": "2024-05-01"
            },
            {
                "name": "Wimbledon",
                "category": "Grand Slam",
                "surface": "Hierba",
                "real_location": "Londres, Inglaterra",
                "fictional_location": "Club Tenis Londres",
                "tournament_date": "2024-07-01"
            }
        ]
        
        for i, tournament_data in enumerate(tournaments_data):
            success, tournament = self.run_test(f"Create Tournament {i+1}", "POST", "tournaments", 200, tournament_data)
            if success and 'id' in tournament:
                self.created_tournaments.append(tournament)
                print(f"   Created: {tournament['name']} - {tournament['points']} points")
        
        # Test getting all tournaments
        success, tournaments = self.run_test("Get All Tournaments", "GET", "tournaments", 200)
        if success:
            print(f"   Found {len(tournaments)} tournaments")
        
        # Test getting specific tournament
        if self.created_tournaments:
            tournament_id = self.created_tournaments[0]['id']
            success, tournament = self.run_test("Get Specific Tournament", "GET", f"tournaments/{tournament_id}", 200)
        
        # Test updating tournament
        if self.created_tournaments:
            tournament_id = self.created_tournaments[0]['id']
            update_data = {
                "name": "Australian Open Updated",
                "category": "Grand Slam",
                "surface": "Dura",
                "real_location": "Melbourne, Australia",
                "fictional_location": "Club Tenis Melbourne Updated",
                "tournament_date": "2024-01-15"
            }
            success, updated = self.run_test("Update Tournament", "PUT", f"tournaments/{tournament_id}", 200, update_data)
        
        return len(self.created_tournaments) >= 2

    def test_matches_crud(self):
        """Test match CRUD operations"""
        print("\n" + "="*50)
        print("TESTING MATCH OPERATIONS")
        print("="*50)
        
        if len(self.created_players) < 2 or len(self.created_tournaments) < 1:
            print("❌ Cannot test matches - need at least 2 players and 1 tournament")
            return False
        
        # Test creating matches with detailed sets
        match_data = {
            "tournament_id": self.created_tournaments[0]['id'],
            "player1_id": self.created_players[0]['id'],
            "player2_id": self.created_players[1]['id'],
            "winner_id": self.created_players[0]['id'],
            "match_date": "2024-01-16",
            "sets": [
                {
                    "player1_games": 6,
                    "player2_games": 4,
                    "tiebreak_p1": None,
                    "tiebreak_p2": None,
                    "supertiebreak_p1": None,
                    "supertiebreak_p2": None
                },
                {
                    "player1_games": 7,
                    "player2_games": 6,
                    "tiebreak_p1": 7,
                    "tiebreak_p2": 5,
                    "supertiebreak_p1": None,
                    "supertiebreak_p2": None
                },
                {
                    "player1_games": 6,
                    "player2_games": 3,
                    "tiebreak_p1": None,
                    "tiebreak_p2": None,
                    "supertiebreak_p1": None,
                    "supertiebreak_p2": None
                }
            ]
        }
        
        success, match = self.run_test("Create Match with Sets", "POST", "matches", 200, match_data)
        if success and 'id' in match:
            self.created_matches.append(match)
            print(f"   Created match: {self.created_players[0]['name']} vs {self.created_players[1]['name']}")
        
        # Test creating match with supertiebreak
        match_data_stb = {
            "tournament_id": self.created_tournaments[1]['id'] if len(self.created_tournaments) > 1 else self.created_tournaments[0]['id'],
            "player1_id": self.created_players[1]['id'],
            "player2_id": self.created_players[0]['id'],
            "winner_id": self.created_players[1]['id'],
            "match_date": "2024-05-02",
            "sets": [
                {
                    "player1_games": 6,
                    "player2_games": 7,
                    "tiebreak_p1": 5,
                    "tiebreak_p2": 7,
                    "supertiebreak_p1": None,
                    "supertiebreak_p2": None
                },
                {
                    "player1_games": 6,
                    "player2_games": 4,
                    "tiebreak_p1": None,
                    "tiebreak_p2": None,
                    "supertiebreak_p1": None,
                    "supertiebreak_p2": None
                },
                {
                    "player1_games": 1,
                    "player2_games": 0,
                    "tiebreak_p1": None,
                    "tiebreak_p2": None,
                    "supertiebreak_p1": 10,
                    "supertiebreak_p2": 8
                }
            ]
        }
        
        success, match2 = self.run_test("Create Match with Supertiebreak", "POST", "matches", 200, match_data_stb)
        if success and 'id' in match2:
            self.created_matches.append(match2)
        
        # Test getting all matches
        success, matches = self.run_test("Get All Matches", "GET", "matches", 200)
        if success:
            print(f"   Found {len(matches)} matches")
        
        # Test getting specific match
        if self.created_matches:
            match_id = self.created_matches[0]['id']
            success, match = self.run_test("Get Specific Match", "GET", f"matches/{match_id}", 200)
        
        return len(self.created_matches) >= 1

    def test_statistics(self):
        """Test statistics endpoints"""
        print("\n" + "="*50)
        print("TESTING STATISTICS")
        print("="*50)
        
        if not self.created_players:
            print("❌ Cannot test statistics - no players created")
            return False
        
        player_id = self.created_players[0]['id']
        
        # Test overall statistics
        success, stats = self.run_test("Get Overall Statistics", "GET", f"stats/overall/{player_id}", 200)
        if success:
            print(f"   Matches played: {stats.get('matches_played', 0)}")
            print(f"   Matches won: {stats.get('matches_won', 0)}")
            print(f"   Win percentage: {stats.get('matches_won_percentage', 0)}%")
        
        # Test surface statistics
        success, surface_stats = self.run_test("Get Surface Statistics", "GET", f"stats/surface/{player_id}", 200)
        if success:
            print(f"   Surface stats available for: {list(surface_stats.keys())}")
        
        return True

    def test_ranking(self):
        """Test ranking endpoint"""
        print("\n" + "="*50)
        print("TESTING RANKING")
        print("="*50)
        
        success, ranking = self.run_test("Get Current Ranking", "GET", "ranking", 200)
        if success:
            print(f"   Ranking has {len(ranking)} players")
            for i, player in enumerate(ranking[:3]):  # Show top 3
                print(f"   {player.get('position', i+1)}. {player.get('player_name', 'Unknown')} - {player.get('points', 0)} points")
        
        return success

    def test_tournament_categories_and_surfaces(self):
        """Test all tournament categories and surfaces"""
        print("\n" + "="*50)
        print("TESTING ALL CATEGORIES AND SURFACES")
        print("="*50)
        
        categories = ["Grand Slam", "Masters 1000", "Masters 500", "ATP Finals", "Copa Davis"]
        surfaces = ["Hierba", "Dura", "Tierra", "Dura Indoor"]
        expected_points = {"Grand Slam": 2000, "Masters 1000": 1000, "Masters 500": 500, "ATP Finals": 1500, "Copa Davis": 0}
        
        all_passed = True
        
        for category in categories:
            for surface in surfaces:
                tournament_data = {
                    "name": f"Test {category} on {surface}",
                    "category": category,
                    "surface": surface,
                    "real_location": "Test Location",
                    "fictional_location": "Test Club",
                    "tournament_date": "2024-12-01"
                }
                
                success, tournament = self.run_test(f"Create {category} on {surface}", "POST", "tournaments", 200, tournament_data)
                if success:
                    if tournament.get('points') == expected_points[category]:
                        print(f"   ✅ Correct points: {tournament.get('points')}")
                    else:
                        print(f"   ❌ Wrong points: expected {expected_points[category]}, got {tournament.get('points')}")
                        all_passed = False
                else:
                    all_passed = False
        
        return all_passed

    def cleanup(self):
        """Clean up created test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete matches
        for match in self.created_matches:
            self.run_test(f"Delete Match", "DELETE", f"matches/{match['id']}", 200)
        
        # Delete tournaments
        for tournament in self.created_tournaments:
            self.run_test(f"Delete Tournament", "DELETE", f"tournaments/{tournament['id']}", 200)
        
        # Note: Player deletion endpoint doesn't exist in the API, so we skip it

def main():
    print("🎾 ATP Tour API Testing Started")
    print("="*60)
    
    tester = ATPTourAPITester()
    
    try:
        # Test all functionality
        players_ok = tester.test_players_crud()
        tournaments_ok = tester.test_tournaments_crud()
        matches_ok = tester.test_matches_crud()
        stats_ok = tester.test_statistics()
        ranking_ok = tester.test_ranking()
        categories_ok = tester.test_tournament_categories_and_surfaces()
        
        # Clean up
        tester.cleanup()
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
        print(f"✅ Players CRUD: {'PASS' if players_ok else 'FAIL'}")
        print(f"✅ Tournaments CRUD: {'PASS' if tournaments_ok else 'FAIL'}")
        print(f"✅ Matches CRUD: {'PASS' if matches_ok else 'FAIL'}")
        print(f"✅ Statistics: {'PASS' if stats_ok else 'FAIL'}")
        print(f"✅ Ranking: {'PASS' if ranking_ok else 'FAIL'}")
        print(f"✅ All Categories/Surfaces: {'PASS' if categories_ok else 'FAIL'}")
        
        success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
        print(f"🎯 Overall Success Rate: {success_rate:.1f}%")
        
        return 0 if success_rate >= 80 else 1
        
    except Exception as e:
        print(f"\n❌ Critical error during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())