from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import bcrypt
import jwt
import httpx
import base64
import tempfile
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'street_os_fallback')
JWT_ALGORITHM = "HS256"

# LLM key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class SpotCreate(BaseModel):
    image_base64: str
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    rarity_tier: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    points: Optional[int] = None

class CommentCreate(BaseModel):
    text: str

class AIRecognizeRequest(BaseModel):
    image_base64: str

class BadgeManage(BaseModel):
    badge_id: str
    action: str  # "add" or "remove"

# Admin emails
ADMIN_EMAILS = ["mathischab78@gmail.com"]

# ==================== AUTH HELPERS ====================

def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Try cookie first
    token = request.cookies.get("session_token")
    # Then try Authorization header
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check if it's a session token (from Google auth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    # Try JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== POINTS SYSTEM ====================

RARITY_POINTS = {
    "common": 5,
    "sport": 15,
    "performance": 30,
    "supercar": 50,
    "hypercar": 100,
    "ultra_rare": 200
}

# ==================== BADGES ====================

BADGES = {
    # Count badges
    "first_spot": {"name": "First Spot", "description": "Premier spot enregistré", "icon": "camera", "category": "count", "threshold": 1},
    "spotter_10": {"name": "Spotter", "description": "10 spots enregistrés", "icon": "eye", "category": "count", "threshold": 10},
    "collector_50": {"name": "Collector", "description": "50 spots enregistrés", "icon": "star", "category": "count", "threshold": 50},
    "photographer_100": {"name": "Photographer", "description": "100 spots enregistrés", "icon": "trophy", "category": "count", "threshold": 100},
    "legend_500": {"name": "Legend", "description": "500 spots enregistrés", "icon": "flame", "category": "count", "threshold": 500},
    # Ranking badges
    "top_10": {"name": "Top 10", "description": "Dans le top 10 du classement", "icon": "medal", "category": "ranking"},
    "top_3": {"name": "Top 3", "description": "Dans le top 3 du classement", "icon": "podium", "category": "ranking"},
    "champion": {"name": "Champion #1", "description": "Numéro 1 du classement", "icon": "crown", "category": "ranking"},
    # Category badges
    "supercar_hunter": {"name": "Supercar Hunter", "description": "10 supercars spottées", "icon": "car-sport", "category": "car_category", "threshold": 10},
    "german_expert": {"name": "German Expert", "description": "20 voitures allemandes spottées", "icon": "flag", "category": "car_category", "threshold": 20},
    "italian_stallion": {"name": "Italian Stallion", "description": "10 voitures italiennes spottées", "icon": "heart", "category": "car_category", "threshold": 10},
}

async def check_and_award_badges(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return
    current_badges = user.get("badges", [])
    spot_count = await db.spots.count_documents({"user_id": user_id})

    new_badges = list(current_badges)

    # Count badges
    count_badges = [
        ("first_spot", 1), ("spotter_10", 10), ("collector_50", 50),
        ("photographer_100", 100), ("legend_500", 500)
    ]
    for badge_id, threshold in count_badges:
        if badge_id not in new_badges and spot_count >= threshold:
            new_badges.append(badge_id)

    # Category badges
    supercar_count = await db.spots.count_documents({
        "user_id": user_id,
        "rarity_tier": {"$in": ["supercar", "hypercar", "ultra_rare"]}
    })
    if "supercar_hunter" not in new_badges and supercar_count >= 10:
        new_badges.append("supercar_hunter")

    german_brands = ["BMW", "Mercedes", "Audi", "Porsche", "Volkswagen"]
    german_count = await db.spots.count_documents({
        "user_id": user_id,
        "brand": {"$in": german_brands}
    })
    if "german_expert" not in new_badges and german_count >= 20:
        new_badges.append("german_expert")

    italian_brands = ["Ferrari", "Lamborghini", "Maserati", "Alfa Romeo", "Pagani"]
    italian_count = await db.spots.count_documents({
        "user_id": user_id,
        "brand": {"$in": italian_brands}
    })
    if "italian_stallion" not in new_badges and italian_count >= 10:
        new_badges.append("italian_stallion")

    # Ranking badges
    leaderboard = await db.users.find({}, {"_id": 0, "user_id": 1, "total_points": 1}).sort("total_points", -1).to_list(10)
    user_ids_top10 = [u["user_id"] for u in leaderboard[:10]]
    user_ids_top3 = [u["user_id"] for u in leaderboard[:3]]
    user_id_top1 = leaderboard[0]["user_id"] if leaderboard else None

    if user_id in user_ids_top10 and "top_10" not in new_badges:
        new_badges.append("top_10")
    if user_id in user_ids_top3 and "top_3" not in new_badges:
        new_badges.append("top_3")
    if user_id == user_id_top1 and "champion" not in new_badges:
        new_badges.append("champion")

    if new_badges != current_badges:
        await db.users.update_one({"user_id": user_id}, {"$set": {"badges": new_badges}})

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    is_admin = data.email in ADMIN_EMAILS
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hashed,
        "picture": "",
        "total_points": 0,
        "spot_count": 0,
        "badges": [],
        "is_admin": is_admin,
        "is_banned": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_jwt(user_id)
    response.set_cookie("session_token", token, path="/", httponly=True, secure=True, samesite="none", max_age=604800)
    return {
        "user_id": user_id, "email": data.email, "name": data.name,
        "token": token, "total_points": 0, "spot_count": 0, "badges": [], "picture": "",
        "is_admin": is_admin
    }

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or "password_hash" not in user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Account banned")
    if not bcrypt.checkpw(data.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["user_id"])
    response.set_cookie("session_token", token, path="/", httponly=True, secure=True, samesite="none", max_age=604800)
    return {
        "user_id": user["user_id"], "email": user["email"], "name": user["name"],
        "token": token, "total_points": user.get("total_points", 0),
        "spot_count": user.get("spot_count", 0), "badges": user.get("badges", []),
        "picture": user.get("picture", ""),
        "is_admin": user.get("is_admin", False)
    }

@api_router.post("/auth/google-session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()

    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {
            "name": data.get("name", existing.get("name", "")),
            "picture": data.get("picture", existing.get("picture", ""))
        }})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        is_admin = data["email"] in ADMIN_EMAILS
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "total_points": 0,
            "spot_count": 0,
            "badges": [],
            "is_admin": is_admin,
            "is_banned": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)

    session_token = data.get("session_token", str(uuid.uuid4()))
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    response.set_cookie("session_token", session_token, path="/", httponly=True, secure=True, samesite="none", max_age=604800)

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "user_id": user["user_id"], "email": user["email"], "name": user["name"],
        "token": session_token, "total_points": user.get("total_points", 0),
        "spot_count": user.get("spot_count", 0), "badges": user.get("badges", []),
        "picture": user.get("picture", ""),
        "is_admin": user.get("is_admin", False)
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"], "email": user["email"], "name": user["name"],
        "total_points": user.get("total_points", 0), "spot_count": user.get("spot_count", 0),
        "badges": user.get("badges", []), "picture": user.get("picture", ""),
        "is_admin": user.get("is_admin", False)
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ==================== AI RECOGNITION ====================

@api_router.post("/recognize")
async def recognize_car(data: AIRecognizeRequest, user: dict = Depends(get_current_user)):
    import google.generativeai as genai
    import json
    import base64

    try:
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY', ''))
        model = genai.GenerativeModel('gemini-1.5-flash')

        image_data = data.image_base64
        if image_data.startswith('data:'):
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)

        prompt = """You are an expert car identifier. Analyze the image and return ONLY a JSON object:
{
  "brand": "Car brand name",
  "model": "Car model name",
  "year": estimated year as integer,
  "rarity_tier": one of "common", "sport", "performance", "supercar", "hypercar", "ultra_rare",
  "confidence": float 0-1
}
Return ONLY the JSON, no other text."""

        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])

        cleaned = response.text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

        result = json.loads(cleaned)
        points = RARITY_POINTS.get(result.get("rarity_tier", "common"), 5)
        result["points"] = points
        return result

    except Exception as e:
        logger.error(f"AI recognition error: {e}")
        return {
            "brand": "Unknown",
            "model": "Unknown",
            "year": 2024,
            "rarity_tier": "common",
            "confidence": 0,
            "points": 5,
            "error": str(e)
        }

# ==================== SPOTS ROUTES ====================

@api_router.post("/spots")
async def create_spot(data: SpotCreate, user: dict = Depends(get_current_user)):
    spot_id = f"spot_{uuid.uuid4().hex[:12]}"
    points = data.points or RARITY_POINTS.get(data.rarity_tier or "common", 5)

    spot_doc = {
        "spot_id": spot_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture", ""),
        "image_base64": data.image_base64,
        "brand": data.brand or "Unknown",
        "model": data.model or "Unknown",
        "year": data.year or 2024,
        "rarity_tier": data.rarity_tier or "common",
        "latitude": data.latitude,
        "longitude": data.longitude,
        "location_name": data.location_name or "",
        "points": points,
        "likes": [],
        "like_count": 0,
        "comment_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.spots.insert_one(spot_doc)

    # Update user stats
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"total_points": points, "spot_count": 1}}
    )

    # Check badges
    await check_and_award_badges(user["user_id"])

    spot_doc.pop("_id", None)
    return spot_doc

@api_router.get("/spots")
async def get_feed(skip: int = 0, limit: int = 20, user: dict = Depends(get_current_user)):
    # Get banned user IDs to exclude their spots
    banned_users = await db.users.find({"is_banned": True}, {"_id": 0, "user_id": 1}).to_list(1000)
    banned_ids = [u["user_id"] for u in banned_users]
    query = {"user_id": {"$nin": banned_ids}} if banned_ids else {}
    spots = await db.spots.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    # Add liked_by_me flag
    for spot in spots:
        spot["liked_by_me"] = user["user_id"] in spot.get("likes", [])
    return spots

@api_router.get("/spots/user/{target_user_id}")
async def get_user_spots(target_user_id: str, user: dict = Depends(get_current_user)):
    spots = await db.spots.find({"user_id": target_user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for spot in spots:
        spot["liked_by_me"] = user["user_id"] in spot.get("likes", [])
    return spots

@api_router.get("/spots/{spot_id}")
async def get_spot(spot_id: str, user: dict = Depends(get_current_user)):
    spot = await db.spots.find_one({"spot_id": spot_id}, {"_id": 0})
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    spot["liked_by_me"] = user["user_id"] in spot.get("likes", [])
    return spot

@api_router.post("/spots/{spot_id}/like")
async def toggle_like(spot_id: str, user: dict = Depends(get_current_user)):
    spot = await db.spots.find_one({"spot_id": spot_id}, {"_id": 0})
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")

    likes = spot.get("likes", [])
    if user["user_id"] in likes:
        likes.remove(user["user_id"])
    else:
        likes.append(user["user_id"])

    await db.spots.update_one(
        {"spot_id": spot_id},
        {"$set": {"likes": likes, "like_count": len(likes)}}
    )
    return {"liked": user["user_id"] in likes, "like_count": len(likes)}

# ==================== COMMENTS ====================

@api_router.post("/spots/{spot_id}/comments")
async def add_comment(spot_id: str, data: CommentCreate, user: dict = Depends(get_current_user)):
    spot = await db.spots.find_one({"spot_id": spot_id}, {"_id": 0})
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")

    comment_id = f"comment_{uuid.uuid4().hex[:12]}"
    comment_doc = {
        "comment_id": comment_id,
        "spot_id": spot_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture", ""),
        "text": data.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc)
    await db.spots.update_one({"spot_id": spot_id}, {"$inc": {"comment_count": 1}})

    comment_doc.pop("_id", None)
    return comment_doc

@api_router.get("/spots/{spot_id}/comments")
async def get_comments(spot_id: str):
    comments = await db.comments.find({"spot_id": spot_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return comments

# ==================== LEADERBOARD ====================

@api_router.get("/leaderboard")
async def get_leaderboard(user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"is_banned": {"$ne": True}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "total_points": 1, "spot_count": 1, "badges": 1}
    ).sort("total_points", -1).to_list(100)

    for i, u in enumerate(users):
        u["rank"] = i + 1

    # Find current user rank
    my_rank = next((u["rank"] for u in users if u["user_id"] == user["user_id"]), 0)

    return {"leaderboard": users, "my_rank": my_rank}

# ==================== PROFILE ====================

@api_router.get("/profile/{target_user_id}")
async def get_profile(target_user_id: str, user: dict = Depends(get_current_user)):
    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Get rank
    users = await db.users.find({}, {"_id": 0, "user_id": 1, "total_points": 1}).sort("total_points", -1).to_list(1000)
    rank = next((i + 1 for i, u in enumerate(users) if u["user_id"] == target_user_id), 0)
    target["rank"] = rank
    return target

@api_router.get("/badges")
async def get_all_badges():
    return BADGES

# ==================== HEALTH ====================

@api_router.get("/")
async def root():
    return {"message": "Street.OS API", "status": "running"}

# ==================== ADMIN HELPERS ====================

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_spots = await db.spots.count_documents({})
    total_comments = await db.comments.count_documents({})
    banned_users = await db.users.count_documents({"is_banned": True})
    total_likes = 0
    spots_cursor = db.spots.find({}, {"_id": 0, "like_count": 1})
    async for s in spots_cursor:
        total_likes += s.get("like_count", 0)
    # Rarity distribution
    rarity_dist = {}
    for tier in ["common", "sport", "performance", "supercar", "hypercar", "ultra_rare"]:
        rarity_dist[tier] = await db.spots.count_documents({"rarity_tier": tier})
    return {
        "total_users": total_users,
        "total_spots": total_spots,
        "total_comments": total_comments,
        "total_likes": total_likes,
        "banned_users": banned_users,
        "rarity_distribution": rarity_dist,
    }

@api_router.get("/admin/users")
async def admin_list_users(user: dict = Depends(require_admin)):
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(500)
    return users

@api_router.delete("/admin/users/{target_user_id}")
async def admin_delete_user(target_user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("is_admin"):
        raise HTTPException(status_code=403, detail="Cannot delete an admin")
    await db.users.delete_one({"user_id": target_user_id})
    await db.spots.delete_many({"user_id": target_user_id})
    await db.comments.delete_many({"user_id": target_user_id})
    await db.user_sessions.delete_many({"user_id": target_user_id})
    return {"message": f"User {target_user_id} and all related data deleted"}

@api_router.post("/admin/users/{target_user_id}/ban")
async def admin_ban_user(target_user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("is_admin"):
        raise HTTPException(status_code=403, detail="Cannot ban an admin")
    await db.users.update_one({"user_id": target_user_id}, {"$set": {"is_banned": True}})
    await db.user_sessions.delete_many({"user_id": target_user_id})
    return {"message": f"User {target_user_id} banned"}

@api_router.post("/admin/users/{target_user_id}/unban")
async def admin_unban_user(target_user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"user_id": target_user_id}, {"$set": {"is_banned": False}})
    return {"message": f"User {target_user_id} unbanned"}

@api_router.delete("/admin/spots/{spot_id}")
async def admin_delete_spot(spot_id: str, user: dict = Depends(require_admin)):
    spot = await db.spots.find_one({"spot_id": spot_id}, {"_id": 0})
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    # Remove points from user
    await db.users.update_one(
        {"user_id": spot["user_id"]},
        {"$inc": {"total_points": -spot.get("points", 0), "spot_count": -1}}
    )
    await db.spots.delete_one({"spot_id": spot_id})
    await db.comments.delete_many({"spot_id": spot_id})
    return {"message": f"Spot {spot_id} deleted"}

@api_router.delete("/admin/comments/{comment_id}")
async def admin_delete_comment(comment_id: str, user: dict = Depends(require_admin)):
    comment = await db.comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    await db.comments.delete_one({"comment_id": comment_id})
    await db.spots.update_one({"spot_id": comment["spot_id"]}, {"$inc": {"comment_count": -1}})
    return {"message": f"Comment {comment_id} deleted"}

@api_router.post("/admin/users/{target_user_id}/badges")
async def admin_manage_badge(target_user_id: str, data: BadgeManage, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    badges = target.get("badges", [])
    if data.action == "add":
        if data.badge_id not in badges:
            badges.append(data.badge_id)
    elif data.action == "remove":
        if data.badge_id in badges:
            badges.remove(data.badge_id)
    await db.users.update_one({"user_id": target_user_id}, {"$set": {"badges": badges}})
    return {"badges": badges}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
