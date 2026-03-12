"""
Bug Fix Verification Tests - Iteration 3
Tests: 1) Leaderboard excludes banned users
       2) Feed excludes spots from banned users
       3) Admin delete operations (spot, user) deduct points correctly
       4) Ban/unban affects leaderboard/feed correctly
"""
import pytest
import requests
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

# Admin credentials
ADMIN_EMAIL = "mathischab78@gmail.com"
ADMIN_PASSWORD = "admin123"

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return token"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Admin logged in: {data.get('email')}")
        return data.get("token"), session
    pytest.skip(f"Cannot login as admin: {response.status_code}")

@pytest.fixture(scope="module")
def test_user_with_spot(admin_token):
    """Create a test user with a spot that will be banned"""
    _, session = admin_token
    email = f"test_ban_user_{int(time.time())}@example.com"
    
    # Register user
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Test Banned User"
    })
    if reg_response.status_code not in [200, 201]:
        pytest.skip("Cannot create test user")
    
    user_data = reg_response.json()
    user_id = user_data["user_id"]
    user_token = user_data["token"]
    
    # Create a spot for this user
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    spot_response = session.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "image_base64": image_base64,
            "brand": "BMW",
            "model": "M3",
            "year": 2023,
            "rarity_tier": "sport",
            "points": 15
        }
    )
    if spot_response.status_code not in [200, 201]:
        pytest.skip("Cannot create test spot")
    
    spot_data = spot_response.json()
    spot_id = spot_data["spot_id"]
    
    print(f"✓ Test user created: {user_id} with spot {spot_id}")
    return {
        "user_id": user_id,
        "email": email,
        "password": "testpass123",
        "user_token": user_token,
        "spot_id": spot_id,
        "spot_points": 15
    }

# ==================== BUG FIX 1: LEADERBOARD EXCLUDES BANNED USERS ====================

def test_leaderboard_excludes_banned_users(admin_token, test_user_with_spot):
    """Test that GET /api/leaderboard excludes users with is_banned=true"""
    admin_tok, session = admin_token
    test_user = test_user_with_spot
    
    # Step 1: Verify user appears in leaderboard before ban
    lb_before = session.get(
        f"{BASE_URL}/api/leaderboard",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert lb_before.status_code == 200
    lb_data_before = lb_before.json()["leaderboard"]
    user_in_lb_before = any(u["user_id"] == test_user["user_id"] for u in lb_data_before)
    print(f"✓ User {test_user['user_id']} in leaderboard before ban: {user_in_lb_before}")
    
    # Step 2: Ban the user
    ban_response = session.post(
        f"{BASE_URL}/api/admin/users/{test_user['user_id']}/ban",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert ban_response.status_code == 200
    print(f"✓ User {test_user['user_id']} banned")
    
    # Step 3: Verify user does NOT appear in leaderboard after ban
    lb_after = session.get(
        f"{BASE_URL}/api/leaderboard",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert lb_after.status_code == 200
    lb_data_after = lb_after.json()["leaderboard"]
    user_in_lb_after = any(u["user_id"] == test_user["user_id"] for u in lb_data_after)
    
    assert user_in_lb_after == False, f"BUG: Banned user {test_user['user_id']} still appears in leaderboard"
    print(f"✓ BUG FIX VERIFIED: Banned user {test_user['user_id']} excluded from leaderboard")
    
    # Step 4: Unban and verify user appears again
    unban_response = session.post(
        f"{BASE_URL}/api/admin/users/{test_user['user_id']}/unban",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert unban_response.status_code == 200
    
    lb_unbanned = session.get(
        f"{BASE_URL}/api/leaderboard",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    lb_data_unbanned = lb_unbanned.json()["leaderboard"]
    user_in_lb_unbanned = any(u["user_id"] == test_user["user_id"] for u in lb_data_unbanned)
    
    assert user_in_lb_unbanned == True, "Unbanned user should appear in leaderboard"
    print(f"✓ Unbanned user {test_user['user_id']} appears in leaderboard again")

# ==================== BUG FIX 2: FEED EXCLUDES BANNED USERS' SPOTS ====================

def test_feed_excludes_banned_users_spots(admin_token, test_user_with_spot):
    """Test that GET /api/spots excludes spots from banned users"""
    admin_tok, session = admin_token
    test_user = test_user_with_spot
    
    # Step 1: Verify spot appears in feed before ban
    feed_before = session.get(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert feed_before.status_code == 200
    spots_before = feed_before.json()
    spot_in_feed_before = any(s["spot_id"] == test_user["spot_id"] for s in spots_before)
    print(f"✓ Spot {test_user['spot_id']} in feed before ban: {spot_in_feed_before}")
    
    # Step 2: Ban the user
    ban_response = session.post(
        f"{BASE_URL}/api/admin/users/{test_user['user_id']}/ban",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert ban_response.status_code == 200
    print(f"✓ User {test_user['user_id']} banned")
    
    # Step 3: Verify spot does NOT appear in feed after ban
    feed_after = session.get(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert feed_after.status_code == 200
    spots_after = feed_after.json()
    spot_in_feed_after = any(s["spot_id"] == test_user["spot_id"] for s in spots_after)
    
    assert spot_in_feed_after == False, f"BUG: Spot {test_user['spot_id']} from banned user still appears in feed"
    print(f"✓ BUG FIX VERIFIED: Spot {test_user['spot_id']} from banned user excluded from feed")
    
    # Step 4: Unban and verify spot appears again
    unban_response = session.post(
        f"{BASE_URL}/api/admin/users/{test_user['user_id']}/unban",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert unban_response.status_code == 200
    
    feed_unbanned = session.get(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    spots_unbanned = feed_unbanned.json()
    spot_in_feed_unbanned = any(s["spot_id"] == test_user["spot_id"] for s in spots_unbanned)
    
    assert spot_in_feed_unbanned == True, "Spot from unbanned user should appear in feed"
    print(f"✓ Spot {test_user['spot_id']} from unbanned user appears in feed again")

# ==================== BUG FIX 3: ADMIN DELETE SPOT DEDUCTS POINTS ====================

def test_admin_delete_spot_deducts_points(admin_token):
    """Test that DELETE /api/admin/spots/{id} deducts points from user"""
    admin_tok, session = admin_token
    
    # Create a new user with a spot
    email = f"test_spot_delete_{int(time.time())}@example.com"
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Spot Delete Test User"
    })
    user_data = reg_response.json()
    user_id = user_data["user_id"]
    user_token = user_data["token"]
    
    # Create spot
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    spot_response = session.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "image_base64": image_base64,
            "brand": "Ferrari",
            "model": "F8",
            "year": 2023,
            "rarity_tier": "hypercar",
            "points": 100
        }
    )
    spot_data = spot_response.json()
    spot_id = spot_data["spot_id"]
    
    # Get user points before deletion
    profile_before = session.get(
        f"{BASE_URL}/api/profile/{user_id}",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    points_before = profile_before.json()["total_points"]
    spot_count_before = profile_before.json()["spot_count"]
    print(f"✓ User points before delete: {points_before}, spot_count: {spot_count_before}")
    
    # Delete spot via admin
    delete_response = session.delete(
        f"{BASE_URL}/api/admin/spots/{spot_id}",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert delete_response.status_code == 200
    print(f"✓ Spot {spot_id} deleted by admin")
    
    # Verify points were deducted
    profile_after = session.get(
        f"{BASE_URL}/api/profile/{user_id}",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    points_after = profile_after.json()["total_points"]
    spot_count_after = profile_after.json()["spot_count"]
    
    assert points_after == points_before - 100, f"BUG: Points not deducted correctly. Before: {points_before}, After: {points_after}"
    assert spot_count_after == spot_count_before - 1, f"BUG: Spot count not decremented. Before: {spot_count_before}, After: {spot_count_after}"
    print(f"✓ BUG FIX VERIFIED: Points deducted correctly ({points_before} -> {points_after}), spot_count decremented ({spot_count_before} -> {spot_count_after})")
    
    # Verify spot no longer exists
    spot_check = session.get(
        f"{BASE_URL}/api/spots/{spot_id}",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert spot_check.status_code == 404
    print(f"✓ Spot {spot_id} removed from database")

# ==================== BUG FIX 4: ADMIN DELETE USER REMOVES ALL DATA ====================

def test_admin_delete_user_removes_all_data(admin_token):
    """Test that DELETE /api/admin/users/{id} removes user, spots, comments, sessions"""
    admin_tok, session = admin_token
    
    # Create a new user
    email = f"test_user_delete_{int(time.time())}@example.com"
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "User Delete Test"
    })
    user_data = reg_response.json()
    user_id = user_data["user_id"]
    user_token = user_data["token"]
    
    # Create spot
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    spot_response = session.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "image_base64": image_base64,
            "brand": "Porsche",
            "model": "911",
            "year": 2023,
            "rarity_tier": "supercar",
            "points": 50
        }
    )
    spot_id = spot_response.json()["spot_id"]
    
    # Add comment
    comment_response = session.post(
        f"{BASE_URL}/api/spots/{spot_id}/comments",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"text": "Test comment"}
    )
    comment_id = comment_response.json()["comment_id"]
    
    print(f"✓ Test user created with spot {spot_id} and comment {comment_id}")
    
    # Delete user via admin
    delete_response = session.delete(
        f"{BASE_URL}/api/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert delete_response.status_code == 200
    print(f"✓ User {user_id} deleted by admin")
    
    # Verify user no longer exists
    users_response = session.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    users = users_response.json()
    user_exists = any(u["user_id"] == user_id for u in users)
    assert user_exists == False, "User should not exist after deletion"
    print(f"✓ User {user_id} removed from database")
    
    # Verify spot no longer exists
    spot_check = session.get(
        f"{BASE_URL}/api/spots/{spot_id}",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert spot_check.status_code == 404
    print(f"✓ User's spots removed")
    
    # Verify comments no longer exist
    comments_check = session.get(f"{BASE_URL}/api/spots/{spot_id}/comments")
    comments = comments_check.json()
    comment_exists = any(c["comment_id"] == comment_id for c in comments)
    assert comment_exists == False, "User's comments should be removed"
    print(f"✓ User's comments removed")

# ==================== ADMIN BAN/UNBAN USER ENDPOINTS ====================

def test_admin_ban_unban_user_endpoints(admin_token):
    """Test POST /api/admin/users/{id}/ban and /unban"""
    admin_tok, session = admin_token
    
    # Create test user
    email = f"test_ban_unban_{int(time.time())}@example.com"
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Ban Unban Test"
    })
    user_data = reg_response.json()
    user_id = user_data["user_id"]
    
    # Ban user
    ban_response = session.post(
        f"{BASE_URL}/api/admin/users/{user_id}/ban",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert ban_response.status_code == 200
    assert "banned" in ban_response.json()["message"].lower()
    print(f"✓ User {user_id} banned successfully")
    
    # Verify user is banned in database
    users_response = session.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    users = users_response.json()
    banned_user = next((u for u in users if u["user_id"] == user_id), None)
    assert banned_user["is_banned"] == True
    print(f"✓ User ban persisted in database")
    
    # Verify banned user cannot login
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": "testpass123"
    })
    assert login_response.status_code == 403
    assert "banned" in login_response.json()["detail"].lower()
    print(f"✓ Banned user cannot login")
    
    # Unban user
    unban_response = session.post(
        f"{BASE_URL}/api/admin/users/{user_id}/unban",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert unban_response.status_code == 200
    assert "unbanned" in unban_response.json()["message"].lower()
    print(f"✓ User {user_id} unbanned successfully")
    
    # Verify user can login again
    login_after_unban = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": "testpass123"
    })
    assert login_after_unban.status_code == 200
    print(f"✓ Unbanned user can login again")
