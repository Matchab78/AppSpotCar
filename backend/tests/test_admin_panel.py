"""
Street.OS Admin Panel API Tests
Tests: Admin authentication, admin endpoints, access control, user management, content moderation
"""
import pytest
import requests
import os
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

# Test user credentials (non-admin)
TEST_EMAIL = f"test_regular_user_{int(time.time())}@example.com"
TEST_PASSWORD = "testpass123"
TEST_NAME = "Regular Test User"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session - used for creating test data"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_client():
    """Separate session for admin requests to avoid cookie bleeding"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def regular_client():
    """Separate session for regular user requests to avoid cookie bleeding"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(admin_client):
    """Login as admin and return token"""
    response = admin_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Admin logged in: {data.get('email')}, is_admin={data.get('is_admin')}")
        assert data.get("is_admin") == True, "Admin user should have is_admin=True"
        return data.get("token")
    pytest.skip(f"Cannot login as admin: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def regular_user_token(regular_client):
    """Create a regular (non-admin) user and return token"""
    response = regular_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"✓ Regular user created: {data.get('email')}, is_admin={data.get('is_admin')}")
        assert data.get("is_admin") == False, "Regular user should have is_admin=False"
        return data.get("token"), data.get("user_id")
    pytest.skip(f"Cannot create regular user: {response.status_code}")

# ==================== ADMIN AUTH TESTS ====================

def test_admin_login_returns_is_admin_true(admin_client):
    """Test that admin login returns is_admin:true"""
    response = admin_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "is_admin" in data
    assert data["is_admin"] == True
    assert data["email"] == ADMIN_EMAIL
    print(f"✓ Admin login returns is_admin=True for {ADMIN_EMAIL}")

def test_regular_user_login_returns_is_admin_false(regular_client, regular_user_token):
    """Test that regular user login returns is_admin:false"""
    token, user_id = regular_user_token
    response = regular_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_admin"] == False
    print(f"✓ Regular user login returns is_admin=False")

# ==================== ADMIN STATS TESTS ====================

def test_admin_stats_success(admin_client, admin_token):
    """Test GET /api/admin/stats returns global statistics"""
    response = admin_client.get(
        f"{BASE_URL}/api/admin/stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    
    # Verify all required fields
    assert "total_users" in data
    assert "total_spots" in data
    assert "total_comments" in data
    assert "total_likes" in data
    assert "banned_users" in data
    assert "rarity_distribution" in data
    
    # Verify data types
    assert isinstance(data["total_users"], int)
    assert isinstance(data["total_spots"], int)
    assert isinstance(data["total_comments"], int)
    assert isinstance(data["total_likes"], int)
    assert isinstance(data["banned_users"], int)
    assert isinstance(data["rarity_distribution"], dict)
    
    print(f"✓ Admin stats retrieved: {data['total_users']} users, {data['total_spots']} spots, {data['banned_users']} banned")

def test_admin_stats_forbidden_for_regular_user(regular_client, regular_user_token):
    """Test that regular user gets 403 on /api/admin/stats"""
    token, user_id = regular_user_token
    response = regular_client.get(
        f"{BASE_URL}/api/admin/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    data = response.json()
    assert "Admin access required" in data["detail"]
    print("✓ Regular user denied access to admin stats (403)")

# ==================== ADMIN USERS LIST TESTS ====================

def test_admin_list_users_success(admin_client, admin_token):
    """Test GET /api/admin/users returns list of users"""
    response = admin_client.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Verify user structure
    user = data[0]
    assert "user_id" in user
    assert "email" in user
    assert "name" in user
    assert "total_points" in user
    assert "spot_count" in user
    assert "badges" in user
    assert "is_admin" in user
    assert "is_banned" in user
    assert "created_at" in user
    assert "password_hash" not in user  # Should be excluded
    
    print(f"✓ Admin users list retrieved: {len(data)} users")

def test_admin_list_users_forbidden_for_regular_user(regular_client, regular_user_token):
    """Test that regular user gets 403 on /api/admin/users"""
    token, user_id = regular_user_token
    response = regular_client.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    print("✓ Regular user denied access to users list (403)")

# ==================== ADMIN BAN/UNBAN TESTS ====================

@pytest.fixture(scope="module")
def bannable_user(api_client):
    """Create a user that can be banned"""
    email = f"test_bannable_{int(time.time())}@example.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Bannable User"
    })
    if response.status_code in [200, 201]:
        data = response.json()
        return data["user_id"], email, "testpass123"
    pytest.skip("Cannot create bannable user")

def test_admin_ban_user_success(admin_client, admin_token, bannable_user):
    """Test POST /api/admin/users/{user_id}/ban"""
    user_id, email, password = bannable_user
    response = api_client.post(
        f"{BASE_URL}/api/admin/users/{user_id}/ban",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "banned" in data["message"].lower()
    print(f"✓ User {user_id} banned successfully")
    
    # Verify user is actually banned in database
    users_response = api_client.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    users = users_response.json()
    banned_user = next((u for u in users if u["user_id"] == user_id), None)
    assert banned_user is not None
    assert banned_user["is_banned"] == True
    print(f"✓ User ban persisted in database")

def test_banned_user_cannot_login(regular_client, bannable_user):
    """Test that banned user gets 403 on login"""
    user_id, email, password = bannable_user
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert response.status_code == 403
    data = response.json()
    assert "banned" in data["detail"].lower()
    print(f"✓ Banned user cannot login (403)")

def test_admin_unban_user_success(admin_client, admin_token, bannable_user):
    """Test POST /api/admin/users/{user_id}/unban"""
    user_id, email, password = bannable_user
    response = api_client.post(
        f"{BASE_URL}/api/admin/users/{user_id}/unban",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "unbanned" in data["message"].lower()
    print(f"✓ User {user_id} unbanned successfully")
    
    # Verify user can now login
    login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_response.status_code == 200
    print(f"✓ Unbanned user can login again")

def test_admin_cannot_ban_admin(admin_client, admin_token):
    """Test that admin cannot ban another admin user"""
    # Get admin user_id
    me_response = api_client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    admin_user_id = me_response.json()["user_id"]
    
    response = api_client.post(
        f"{BASE_URL}/api/admin/users/{admin_user_id}/ban",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 403
    data = response.json()
    assert "Cannot ban an admin" in data["detail"]
    print("✓ Admin cannot ban another admin (403)")

def test_regular_user_cannot_ban(regular_client, regular_user_token, bannable_user):
    """Test that regular user cannot ban users"""
    token, _ = regular_user_token
    user_id, _, _ = bannable_user
    response = api_client.post(
        f"{BASE_URL}/api/admin/users/{user_id}/ban",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    print("✓ Regular user cannot ban users (403)")

# ==================== ADMIN DELETE USER TESTS ====================

@pytest.fixture(scope="module")
def deletable_user(api_client):
    """Create a user that can be deleted"""
    email = f"test_deletable_{int(time.time())}@example.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Deletable User"
    })
    if response.status_code in [200, 201]:
        data = response.json()
        return data["user_id"], data["token"]
    pytest.skip("Cannot create deletable user")

def test_admin_delete_user_success(admin_client, admin_token, deletable_user):
    """Test DELETE /api/admin/users/{user_id}"""
    user_id, user_token = deletable_user
    
    # First create a spot for this user
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    spot_response = api_client.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "image_base64": image_base64,
            "brand": "Test",
            "model": "Car",
            "rarity_tier": "common",
            "points": 5
        }
    )
    spot_id = spot_response.json().get("spot_id")
    
    # Delete user
    response = api_client.delete(
        f"{BASE_URL}/api/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "deleted" in data["message"].lower()
    print(f"✓ User {user_id} deleted successfully")
    
    # Verify user no longer exists
    users_response = api_client.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    users = users_response.json()
    deleted_user = next((u for u in users if u["user_id"] == user_id), None)
    assert deleted_user is None
    print(f"✓ User removed from database")

def test_admin_cannot_delete_admin(admin_client, admin_token):
    """Test that admin cannot delete another admin user"""
    # Get admin user_id
    me_response = api_client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    admin_user_id = me_response.json()["user_id"]
    
    response = api_client.delete(
        f"{BASE_URL}/api/admin/users/{admin_user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 403
    data = response.json()
    assert "Cannot delete an admin" in data["detail"]
    print("✓ Admin cannot delete another admin (403)")

def test_regular_user_cannot_delete_user(regular_client, regular_user_token):
    """Test that regular user cannot delete users"""
    token, user_id = regular_user_token
    response = api_client.delete(
        f"{BASE_URL}/api/admin/users/some_user_id",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    print("✓ Regular user cannot delete users (403)")

# ==================== ADMIN DELETE SPOT TESTS ====================

@pytest.fixture(scope="module")
def deletable_spot(api_client, regular_user_token):
    """Create a spot that can be deleted"""
    token, user_id = regular_user_token
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    response = api_client.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "image_base64": image_base64,
            "brand": "BMW",
            "model": "M5",
            "rarity_tier": "sport",
            "points": 15
        }
    )
    if response.status_code in [200, 201]:
        data = response.json()
        return data["spot_id"], user_id
    pytest.skip("Cannot create deletable spot")

def test_admin_delete_spot_success(admin_client, admin_token, deletable_spot):
    """Test DELETE /api/admin/spots/{spot_id}"""
    spot_id, user_id = deletable_spot
    
    # Get user points before deletion
    me_before = api_client.get(
        f"{BASE_URL}/api/profile/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    points_before = me_before.json()["total_points"]
    spots_before = me_before.json()["spot_count"]
    
    # Delete spot
    response = api_client.delete(
        f"{BASE_URL}/api/admin/spots/{spot_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "deleted" in data["message"].lower()
    print(f"✓ Spot {spot_id} deleted successfully")
    
    # Verify spot no longer exists
    spot_response = api_client.get(
        f"{BASE_URL}/api/spots/{spot_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert spot_response.status_code == 404
    print(f"✓ Spot removed from database")
    
    # Verify user points were deducted
    me_after = api_client.get(
        f"{BASE_URL}/api/profile/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    points_after = me_after.json()["total_points"]
    spots_after = me_after.json()["spot_count"]
    assert points_after == points_before - 15  # 15 points for sport tier
    assert spots_after == spots_before - 1
    print(f"✓ User points deducted: {points_before} -> {points_after}")

def test_regular_user_cannot_delete_spot(regular_client, regular_user_token):
    """Test that regular user cannot delete spots"""
    token, user_id = regular_user_token
    response = api_client.delete(
        f"{BASE_URL}/api/admin/spots/some_spot_id",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    print("✓ Regular user cannot delete spots (403)")

# ==================== ADMIN DELETE COMMENT TESTS ====================

@pytest.fixture(scope="module")
def deletable_comment(api_client, regular_user_token):
    """Create a comment that can be deleted"""
    token, user_id = regular_user_token
    
    # First create a spot
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    spot_response = api_client.post(
        f"{BASE_URL}/api/spots",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "image_base64": image_base64,
            "brand": "Audi",
            "model": "R8",
            "rarity_tier": "performance",
            "points": 30
        }
    )
    spot_id = spot_response.json()["spot_id"]
    
    # Add comment to spot
    comment_response = api_client.post(
        f"{BASE_URL}/api/spots/{spot_id}/comments",
        headers={"Authorization": f"Bearer {token}"},
        json={"text": "This is a test comment to be deleted"}
    )
    if comment_response.status_code in [200, 201]:
        comment = comment_response.json()
        return comment["comment_id"], spot_id
    pytest.skip("Cannot create deletable comment")

def test_admin_delete_comment_success(admin_client, admin_token, deletable_comment):
    """Test DELETE /api/admin/comments/{comment_id}"""
    comment_id, spot_id = deletable_comment
    
    # Get comment count before deletion
    spot_before = api_client.get(
        f"{BASE_URL}/api/spots/{spot_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    comment_count_before = spot_before.json()["comment_count"]
    
    # Delete comment
    response = api_client.delete(
        f"{BASE_URL}/api/admin/comments/{comment_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "deleted" in data["message"].lower()
    print(f"✓ Comment {comment_id} deleted successfully")
    
    # Verify comment no longer exists
    comments = api_client.get(f"{BASE_URL}/api/spots/{spot_id}/comments")
    comments_list = comments.json()
    deleted_comment = next((c for c in comments_list if c["comment_id"] == comment_id), None)
    assert deleted_comment is None
    print(f"✓ Comment removed from database")
    
    # Verify spot comment_count was decremented
    spot_after = api_client.get(
        f"{BASE_URL}/api/spots/{spot_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    comment_count_after = spot_after.json()["comment_count"]
    assert comment_count_after == comment_count_before - 1
    print(f"✓ Spot comment_count decremented: {comment_count_before} -> {comment_count_after}")

def test_regular_user_cannot_delete_comment(regular_client, regular_user_token):
    """Test that regular user cannot delete comments"""
    token, user_id = regular_user_token
    response = api_client.delete(
        f"{BASE_URL}/api/admin/comments/some_comment_id",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    print("✓ Regular user cannot delete comments (403)")

# ==================== ADMIN MANAGE BADGES TESTS ====================

@pytest.fixture(scope="module")
def badge_test_user(api_client):
    """Create a user for badge management tests"""
    email = f"test_badge_{int(time.time())}@example.com"
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Badge Test User"
    })
    if response.status_code in [200, 201]:
        return response.json()["user_id"]
    pytest.skip("Cannot create badge test user")

def test_admin_add_badge_success(admin_client, admin_token, badge_test_user):
    """Test POST /api/admin/users/{user_id}/badges with action='add'"""
    user_id = badge_test_user
    
    response = api_client.post(
        f"{BASE_URL}/api/admin/users/{user_id}/badges",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"badge_id": "champion", "action": "add"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "badges" in data
    assert "champion" in data["badges"]
    print(f"✓ Badge 'champion' added to user {user_id}")
    
    # Verify badge persisted
    users_response = api_client.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    users = users_response.json()
    user = next((u for u in users if u["user_id"] == user_id), None)
    assert user is not None
    assert "champion" in user["badges"]
    print(f"✓ Badge persisted in database")

def test_admin_remove_badge_success(admin_client, admin_token, badge_test_user):
    """Test POST /api/admin/users/{user_id}/badges with action='remove'"""
    user_id = badge_test_user
    
    response = api_client.post(
        f"{BASE_URL}/api/admin/users/{user_id}/badges",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"badge_id": "champion", "action": "remove"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "badges" in data
    assert "champion" not in data["badges"]
    print(f"✓ Badge 'champion' removed from user {user_id}")

def test_regular_user_cannot_manage_badges(regular_client, regular_user_token, badge_test_user):
    """Test that regular user cannot manage badges"""
    token, _ = regular_user_token
    user_id = badge_test_user
    
    response = api_client.post(
        f"{BASE_URL}/api/admin/users/{user_id}/badges",
        headers={"Authorization": f"Bearer {token}"},
        json={"badge_id": "champion", "action": "add"}
    )
    assert response.status_code == 403
    print("✓ Regular user cannot manage badges (403)")
