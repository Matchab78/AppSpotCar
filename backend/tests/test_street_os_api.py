"""
Street.OS Backend API Tests
Tests all authentication, spots, likes, comments, leaderboard, profile, and badges endpoints
"""
import pytest
import requests
import os
import base64
import time
from pathlib import Path

# Load BACKEND_URL from frontend/.env
def load_backend_url():
    frontend_env = Path('/app/frontend/.env')
    if frontend_env.exists():
        with open(frontend_env) as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    return ''

BASE_URL = load_backend_url().rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_user_{int(time.time())}@example.com"
TEST_PASSWORD = "testpass123"
TEST_NAME = "Test User"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Register a test user and return auth token"""
    # Register test user
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    if response.status_code == 201 or response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Cannot register test user: {response.status_code}")

# ==================== HEALTH CHECK ====================

def test_health_check(api_client):
    """Test API health check endpoint"""
    response = api_client.get(f"{BASE_URL}/api/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "running"
    print("✓ Health check passed")

# ==================== AUTH TESTS ====================

def test_register_new_user(api_client):
    """Test user registration with new email"""
    email = f"new_user_{int(time.time())}@example.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "newpass123",
        "name": "New User"
    })
    assert response.status_code in [200, 201]
    data = response.json()
    assert "token" in data
    assert "user_id" in data
    assert data["email"] == email
    assert data["name"] == "New User"
    assert data["total_points"] == 0
    assert data["spot_count"] == 0
    print(f"✓ User registration successful: {data['user_id']}")

def test_register_duplicate_email(api_client, auth_token):
    """Test registration with existing email should fail"""
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    assert response.status_code == 400
    data = response.json()
    assert "already registered" in data["detail"].lower()
    print("✓ Duplicate email registration blocked")

def test_login_success(api_client):
    """Test login with valid credentials"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "user_id" in data
    assert data["email"] == TEST_EMAIL
    print(f"✓ Login successful: {data['user_id']}")

def test_login_invalid_credentials(api_client):
    """Test login with invalid credentials"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    data = response.json()
    assert "Invalid credentials" in data["detail"]
    print("✓ Invalid login rejected")

def test_auth_me(api_client, auth_token):
    """Test /api/auth/me endpoint with valid token"""
    response = api_client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "email" in data
    assert data["email"] == TEST_EMAIL
    assert "total_points" in data
    assert "spot_count" in data
    print(f"✓ Auth check passed: {data['name']}")

def test_auth_me_no_token(api_client):
    """Test /api/auth/me without token should fail"""
    response = api_client.get(f"{BASE_URL}/api/auth/me")
    assert response.status_code == 401
    print("✓ Unauthorized access blocked")

# ==================== SPOTS TESTS ====================

@pytest.fixture(scope="module")
def test_spot_id(api_client, auth_token):
    """Create a test spot and return its ID"""
    # Create a simple base64 image (1x1 red pixel PNG)
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    response = api_client.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "image_base64": image_base64,
            "brand": "Ferrari",
            "model": "488 GTB",
            "year": 2023,
            "rarity_tier": "hypercar",
            "points": 100,
            "latitude": 48.8566,
            "longitude": 2.3522,
            "location_name": "Paris, France"
        }
    )
    if response.status_code in [200, 201]:
        data = response.json()
        return data["spot_id"]
    pytest.skip(f"Cannot create test spot: {response.status_code}")

def test_create_spot(api_client, auth_token):
    """Test creating a new spot"""
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    response = api_client.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "image_base64": image_base64,
            "brand": "Porsche",
            "model": "911 GT3",
            "year": 2024,
            "rarity_tier": "supercar",
            "points": 50
        }
    )
    assert response.status_code in [200, 201]
    data = response.json()
    assert "spot_id" in data
    assert data["brand"] == "Porsche"
    assert data["model"] == "911 GT3"
    assert data["points"] == 50
    assert data["like_count"] == 0
    assert data["comment_count"] == 0
    print(f"✓ Spot created: {data['spot_id']}")
    
    # Verify spot was persisted - GET to check
    spot_id = data["spot_id"]
    get_response = api_client.get(
        f"{BASE_URL}/api/spots/{spot_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["brand"] == "Porsche"
    print(f"✓ Spot persisted and retrieved successfully")

def test_get_spots_feed(api_client, auth_token):
    """Test getting spots feed"""
    response = api_client.get(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        spot = data[0]
        assert "spot_id" in spot
        assert "brand" in spot
        assert "model" in spot
        assert "liked_by_me" in spot
    print(f"✓ Feed retrieved: {len(data)} spots")

def test_get_single_spot(api_client, auth_token, test_spot_id):
    """Test getting a single spot by ID"""
    response = api_client.get(
        f"{BASE_URL}/api/spots/{test_spot_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["spot_id"] == test_spot_id
    assert "brand" in data
    assert "liked_by_me" in data
    print(f"✓ Single spot retrieved: {data['brand']} {data['model']}")

def test_get_nonexistent_spot(api_client, auth_token):
    """Test getting a non-existent spot"""
    response = api_client.get(
        f"{BASE_URL}/api/spots/nonexistent_spot_id",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404
    print("✓ Non-existent spot returns 404")

# ==================== LIKES TESTS ====================

def test_like_spot(api_client, auth_token, test_spot_id):
    """Test liking a spot"""
    response = api_client.post(
        f"{BASE_URL}/api/spots/{test_spot_id}/like",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "liked" in data
    assert "like_count" in data
    assert data["liked"] == True
    print(f"✓ Spot liked: like_count={data['like_count']}")
    
    # Verify persistence
    get_response = api_client.get(
        f"{BASE_URL}/api/spots/{test_spot_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["liked_by_me"] == True
    print("✓ Like persisted successfully")

def test_unlike_spot(api_client, auth_token, test_spot_id):
    """Test unliking a spot (toggle off)"""
    # First like
    api_client.post(
        f"{BASE_URL}/api/spots/{test_spot_id}/like",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    # Then unlike
    response = api_client.post(
        f"{BASE_URL}/api/spots/{test_spot_id}/like",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["liked"] == False
    print(f"✓ Spot unliked: like_count={data['like_count']}")

# ==================== COMMENTS TESTS ====================

def test_add_comment(api_client, auth_token, test_spot_id):
    """Test adding a comment to a spot"""
    response = api_client.post(
        f"{BASE_URL}/api/spots/{test_spot_id}/comments",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"text": "Amazing car! Great spot!"}
    )
    assert response.status_code in [200, 201]
    data = response.json()
    assert "comment_id" in data
    assert data["text"] == "Amazing car! Great spot!"
    assert "user_name" in data
    print(f"✓ Comment added: {data['comment_id']}")
    
    # Verify comment persisted
    get_response = api_client.get(f"{BASE_URL}/api/spots/{test_spot_id}/comments")
    assert get_response.status_code == 200
    comments = get_response.json()
    assert len(comments) > 0
    assert any(c["text"] == "Amazing car! Great spot!" for c in comments)
    print("✓ Comment persisted successfully")

def test_get_comments(api_client, test_spot_id):
    """Test getting comments for a spot"""
    response = api_client.get(f"{BASE_URL}/api/spots/{test_spot_id}/comments")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        comment = data[0]
        assert "comment_id" in comment
        assert "text" in comment
        assert "user_name" in comment
    print(f"✓ Comments retrieved: {len(data)} comments")

def test_add_comment_to_nonexistent_spot(api_client, auth_token):
    """Test adding comment to non-existent spot"""
    response = api_client.post(
        f"{BASE_URL}/api/spots/nonexistent_spot/comments",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"text": "This should fail"}
    )
    assert response.status_code == 404
    print("✓ Comment to non-existent spot returns 404")

# ==================== LEADERBOARD TESTS ====================

def test_get_leaderboard(api_client, auth_token):
    """Test getting leaderboard"""
    response = api_client.get(
        f"{BASE_URL}/api/leaderboard",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "leaderboard" in data
    assert "my_rank" in data
    assert isinstance(data["leaderboard"], list)
    
    if len(data["leaderboard"]) > 0:
        user = data["leaderboard"][0]
        assert "user_id" in user
        assert "name" in user
        assert "total_points" in user
        assert "rank" in user
        assert user["rank"] == 1  # First user should be rank 1
    print(f"✓ Leaderboard retrieved: {len(data['leaderboard'])} users, my_rank={data['my_rank']}")

# ==================== PROFILE TESTS ====================

def test_get_profile(api_client, auth_token):
    """Test getting user profile"""
    # First get own user_id
    me_response = api_client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    user_id = me_response.json()["user_id"]
    
    # Get profile
    response = api_client.get(
        f"{BASE_URL}/api/profile/{user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "name" in data
    assert "total_points" in data
    assert "spot_count" in data
    assert "rank" in data
    assert "badges" in data
    print(f"✓ Profile retrieved: {data['name']}, rank={data['rank']}, points={data['total_points']}")

def test_get_nonexistent_profile(api_client, auth_token):
    """Test getting non-existent user profile"""
    response = api_client.get(
        f"{BASE_URL}/api/profile/nonexistent_user_id",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404
    print("✓ Non-existent profile returns 404")

# ==================== BADGES TESTS ====================

def test_get_badges(api_client):
    """Test getting all available badges"""
    response = api_client.get(f"{BASE_URL}/api/badges")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    # Check for some known badges
    assert "first_spot" in data
    assert "spotter_10" in data
    assert "champion" in data
    
    # Verify badge structure
    badge = data["first_spot"]
    assert "name" in badge
    assert "description" in badge
    assert "category" in badge
    print(f"✓ Badges retrieved: {len(data)} badges")

# ==================== USER SPOTS TESTS ====================

def test_get_user_spots(api_client, auth_token):
    """Test getting spots for a specific user"""
    # Get own user_id
    me_response = api_client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    user_id = me_response.json()["user_id"]
    
    # Get user's spots
    response = api_client.get(
        f"{BASE_URL}/api/spots/user/{user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # All spots should belong to this user
    for spot in data:
        assert spot["user_id"] == user_id
    print(f"✓ User spots retrieved: {len(data)} spots")
