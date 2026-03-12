import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Rarity colors
const RARITY_COLORS = {
  common: "#A1A1AA",
  sport: "#3B82F6",
  performance: "#8B5CF6",
  supercar: "#F59E0B",
  hypercar: "#EF4444",
  ultra_rare: "#EAB308"
};

const RARITY_POINTS = {
  common: 5,
  sport: 15,
  performance: 30,
  supercar: 50,
  hypercar: 100,
  ultra_rare: 200
};

// Auth Context
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUser(res.data);
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem("token");
        setToken(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return { user, token, loading, login, register, logout, setUser };
};

// Icons (SVG)
const Icons = {
  Camera: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  Home: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  ),
  Trophy: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  ),
  User: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Heart: ({ filled }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#EF4444" : "none"} stroke={filled ? "#EF4444" : "currentColor"} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  MessageCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Star: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  ),
  Settings: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Upload: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17,8 12,3 7,8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  X: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Award: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/>
    </svg>
  ),
};

// Auth Screen
const AuthScreen = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, name);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de connexion");
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen" data-testid="auth-screen">
      <div className="auth-hero">
        <img 
          src="https://images.unsplash.com/photo-1769674154615-0cd4f99f9945?w=1200" 
          alt="Supercar" 
          className="auth-hero-image"
        />
        <div className="auth-hero-overlay" />
      </div>
      <div className="auth-content">
        <div className="auth-logo">
          <span className="logo-street">STREET</span>
          <span className="logo-dot">.</span>
          <span className="logo-os">OS</span>
        </div>
        <p className="auth-tagline">SPOT. IDENTIFY. COLLECT.</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <input
              type="text"
              placeholder="Nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-input"
              data-testid="register-name-input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            data-testid="auth-email-input"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            data-testid="auth-password-input"
          />
          
          {error && <p className="auth-error">{error}</p>}
          
          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
            data-testid="auth-submit-button"
          >
            {loading ? "..." : isLogin ? "CONNEXION" : "S'INSCRIRE"}
          </button>
        </form>
        
        <button 
          className="auth-toggle"
          onClick={() => setIsLogin(!isLogin)}
          data-testid="auth-toggle-button"
        >
          {isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Connexion"}
        </button>
      </div>
    </div>
  );
};

// Spot Card
const SpotCard = ({ spot, token, onLike, onOpenDetail }) => {
  const [liked, setLiked] = useState(spot.liked_by_me);
  const [likeCount, setLikeCount] = useState(spot.like_count || 0);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`${API}/spots/${spot.spot_id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
      if (onLike) onLike(spot.spot_id, res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="spot-card" onClick={() => onOpenDetail(spot)} data-testid={`spot-card-${spot.spot_id}`}>
      <div className="spot-header">
        <div className="spot-user">
          {spot.user_picture ? (
            <img src={spot.user_picture} alt={spot.user_name} className="spot-user-avatar" />
          ) : (
            <div className="spot-user-avatar-placeholder">{spot.user_name?.[0]?.toUpperCase()}</div>
          )}
          <span className="spot-user-name">{spot.user_name}</span>
        </div>
        <div className="spot-points" style={{ color: RARITY_COLORS[spot.rarity_tier] }}>
          +{spot.points} pts
        </div>
      </div>
      
      <div className="spot-image-container">
        <img src={`data:image/jpeg;base64,${spot.image_base64}`} alt={`${spot.brand} ${spot.model}`} className="spot-image" />
        <div className="spot-rarity-badge" style={{ backgroundColor: RARITY_COLORS[spot.rarity_tier] }}>
          {spot.rarity_tier?.toUpperCase()}
        </div>
      </div>
      
      <div className="spot-info">
        <h3 className="spot-car-name">{spot.brand} {spot.model}</h3>
        <span className="spot-car-year">{spot.year}</span>
      </div>
      
      {spot.location_name && (
        <div className="spot-location">
          <Icons.MapPin />
          <span>{spot.location_name}</span>
        </div>
      )}
      
      <div className="spot-actions">
        <button className="spot-action-btn" onClick={handleLike} data-testid={`like-btn-${spot.spot_id}`}>
          <Icons.Heart filled={liked} />
          <span>{likeCount}</span>
        </button>
        <button className="spot-action-btn" data-testid={`comment-btn-${spot.spot_id}`}>
          <Icons.MessageCircle />
          <span>{spot.comment_count || 0}</span>
        </button>
      </div>
    </div>
  );
};

// Feed Screen
const FeedScreen = ({ token, onOpenDetail }) => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const res = await axios.get(`${API}/spots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSpots(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading-screen"><div className="loader" /></div>;
  }

  return (
    <div className="feed-screen" data-testid="feed-screen">
      <div className="feed-header">
        <h1 className="feed-title">FEED</h1>
        <span className="feed-subtitle">{spots.length} SPOTS</span>
      </div>
      
      {spots.length === 0 ? (
        <div className="empty-feed">
          <Icons.Camera />
          <p>Aucun spot pour le moment</p>
          <p className="empty-hint">Soyez le premier à spotter !</p>
        </div>
      ) : (
        <div className="feed-grid">
          {spots.map(spot => (
            <SpotCard 
              key={spot.spot_id} 
              spot={spot} 
              token={token}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Capture Screen
const CaptureScreen = ({ token, user, onSpotCreated }) => {
  const [step, setStep] = useState("upload"); // upload, recognizing, confirm
  const [imageBase64, setImageBase64] = useState(null);
  const [carData, setCarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result.split(",")[1];
      setImageBase64(base64);
      setStep("recognizing");
      setLoading(true);
      setError("");
      
      try {
        const res = await axios.post(`${API}/recognize`, { image_base64: base64 }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCarData(res.data);
        setStep("confirm");
      } catch (err) {
        setError("Erreur lors de la reconnaissance");
        setCarData({
          brand: "Unknown",
          model: "Unknown",
          year: 2024,
          rarity_tier: "common",
          points: 5
        });
        setStep("confirm");
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/spots`, {
        image_base64: imageBase64,
        brand: carData.brand,
        model: carData.model,
        year: carData.year,
        rarity_tier: carData.rarity_tier,
        points: carData.points
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSpotCreated();
      setStep("upload");
      setImageBase64(null);
      setCarData(null);
    } catch (err) {
      setError("Erreur lors de l'enregistrement");
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setStep("upload");
    setImageBase64(null);
    setCarData(null);
    setError("");
  };

  return (
    <div className="capture-screen" data-testid="capture-screen">
      {step === "upload" && (
        <div className="capture-upload">
          <div className="capture-header">
            <h1>NOUVEAU SPOT</h1>
            <p>Capturez une voiture rare</p>
          </div>
          <label className="capture-dropzone" data-testid="capture-dropzone">
            <input type="file" accept="image/*" onChange={handleFileSelect} hidden />
            <Icons.Upload />
            <span>Sélectionner une image</span>
            <span className="capture-hint">JPG, PNG - Max 10MB</span>
          </label>
        </div>
      )}
      
      {step === "recognizing" && (
        <div className="capture-recognizing">
          <div className="loader" />
          <p>Identification en cours...</p>
          <p className="capture-hint">Analyse IA GPT-4o Vision</p>
        </div>
      )}
      
      {step === "confirm" && carData && (
        <div className="capture-confirm">
          <div className="capture-preview">
            <img src={`data:image/jpeg;base64,${imageBase64}`} alt="Preview" className="capture-preview-image" />
            <div className="capture-hud-overlay">
              <div className="hud-corner top-left" />
              <div className="hud-corner top-right" />
              <div className="hud-corner bottom-left" />
              <div className="hud-corner bottom-right" />
            </div>
          </div>
          
          <div className="capture-result">
            <div className="capture-car-info">
              <h2>{carData.brand} {carData.model}</h2>
              <span className="capture-year">{carData.year}</span>
            </div>
            
            <div className="capture-rarity" style={{ borderColor: RARITY_COLORS[carData.rarity_tier] }}>
              <span className="rarity-label">RARETÉ</span>
              <span className="rarity-value" style={{ color: RARITY_COLORS[carData.rarity_tier] }}>
                {carData.rarity_tier?.toUpperCase()}
              </span>
              <span className="rarity-points">+{carData.points} PTS</span>
            </div>
            
            {error && <p className="capture-error">{error}</p>}
            
            <div className="capture-actions">
              <button className="capture-btn cancel" onClick={handleCancel} data-testid="capture-cancel-btn">
                ANNULER
              </button>
              <button 
                className="capture-btn confirm" 
                onClick={handleConfirm}
                disabled={loading}
                data-testid="capture-confirm-btn"
              >
                {loading ? "..." : "CONFIRMER"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Leaderboard Screen
const LeaderboardScreen = ({ token, user }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaderboard(res.data.leaderboard);
      setMyRank(res.data.my_rank);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading-screen"><div className="loader" /></div>;
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="leaderboard-screen" data-testid="leaderboard-screen">
      <div className="leaderboard-header">
        <h1>CLASSEMENT</h1>
        <div className="my-rank">
          <span>Votre rang</span>
          <span className="rank-number">#{myRank}</span>
        </div>
      </div>
      
      <div className="podium">
        {top3[1] && (
          <div className="podium-item second">
            <div className="podium-avatar">
              {top3[1].picture ? (
                <img src={top3[1].picture} alt={top3[1].name} />
              ) : (
                <span>{top3[1].name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <span className="podium-name">{top3[1].name}</span>
            <span className="podium-points">{top3[1].total_points} pts</span>
            <div className="podium-stand">2</div>
          </div>
        )}
        {top3[0] && (
          <div className="podium-item first">
            <div className="podium-crown">👑</div>
            <div className="podium-avatar">
              {top3[0].picture ? (
                <img src={top3[0].picture} alt={top3[0].name} />
              ) : (
                <span>{top3[0].name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <span className="podium-name">{top3[0].name}</span>
            <span className="podium-points">{top3[0].total_points} pts</span>
            <div className="podium-stand">1</div>
          </div>
        )}
        {top3[2] && (
          <div className="podium-item third">
            <div className="podium-avatar">
              {top3[2].picture ? (
                <img src={top3[2].picture} alt={top3[2].name} />
              ) : (
                <span>{top3[2].name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <span className="podium-name">{top3[2].name}</span>
            <span className="podium-points">{top3[2].total_points} pts</span>
            <div className="podium-stand">3</div>
          </div>
        )}
      </div>
      
      <div className="leaderboard-list">
        {rest.map((u, i) => (
          <div 
            key={u.user_id} 
            className={`leaderboard-item ${u.user_id === user?.user_id ? 'me' : ''}`}
            data-testid={`leaderboard-item-${u.user_id}`}
          >
            <span className="lb-rank">#{i + 4}</span>
            <div className="lb-user">
              {u.picture ? (
                <img src={u.picture} alt={u.name} className="lb-avatar" />
              ) : (
                <div className="lb-avatar-placeholder">{u.name?.[0]?.toUpperCase()}</div>
              )}
              <span className="lb-name">{u.name}</span>
            </div>
            <div className="lb-stats">
              <span className="lb-spots">{u.spot_count} spots</span>
              <span className="lb-points">{u.total_points} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Profile Screen
const ProfileScreen = ({ token, user, onLogout }) => {
  const [profile, setProfile] = useState(null);
  const [spots, setSpots] = useState([]);
  const [badges, setBadges] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const [profileRes, spotsRes, badgesRes] = await Promise.all([
        axios.get(`${API}/profile/${user.user_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/spots/user/${user.user_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/badges`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProfile(profileRes.data);
      setSpots(spotsRes.data);
      setBadges(badgesRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading || !profile) {
    return <div className="loading-screen"><div className="loader" /></div>;
  }

  return (
    <div className="profile-screen" data-testid="profile-screen">
      <div className="profile-header">
        <div className="profile-avatar-container">
          {profile.picture ? (
            <img src={profile.picture} alt={profile.name} className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">{profile.name?.[0]?.toUpperCase()}</div>
          )}
        </div>
        <h1 className="profile-name">{profile.name}</h1>
        <span className="profile-rank">RANG #{profile.rank}</span>
      </div>
      
      <div className="profile-stats">
        <div className="stat-item">
          <span className="stat-value">{profile.total_points}</span>
          <span className="stat-label">POINTS</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{profile.spot_count}</span>
          <span className="stat-label">SPOTS</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{profile.badges?.length || 0}</span>
          <span className="stat-label">BADGES</span>
        </div>
      </div>
      
      {profile.badges?.length > 0 && (
        <div className="profile-badges">
          <h3>BADGES</h3>
          <div className="badges-grid">
            {profile.badges.map(badgeId => {
              const badge = badges[badgeId];
              return badge ? (
                <div key={badgeId} className="badge-item" data-testid={`badge-${badgeId}`}>
                  <Icons.Award />
                  <span>{badge.name}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
      
      <div className="profile-gallery">
        <h3>MES SPOTS ({spots.length})</h3>
        <div className="gallery-grid">
          {spots.map(spot => (
            <div key={spot.spot_id} className="gallery-item" data-testid={`gallery-spot-${spot.spot_id}`}>
              <img src={`data:image/jpeg;base64,${spot.image_base64}`} alt={`${spot.brand} ${spot.model}`} />
              <div className="gallery-overlay">
                <span>{spot.brand} {spot.model}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <button className="logout-btn" onClick={onLogout} data-testid="logout-btn">
        <Icons.LogOut />
        <span>Déconnexion</span>
      </button>
    </div>
  );
};

// Spot Detail Modal
const SpotDetailModal = ({ spot, token, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [spot]);

  const loadComments = async () => {
    try {
      const res = await axios.get(`${API}/spots/${spot.spot_id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/spots/${spot.spot_id}/comments`, 
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([res.data, ...comments]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="spot-detail-modal">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} data-testid="modal-close-btn">
          <Icons.X />
        </button>
        
        <div className="modal-image">
          <img src={`data:image/jpeg;base64,${spot.image_base64}`} alt={`${spot.brand} ${spot.model}`} />
        </div>
        
        <div className="modal-info">
          <div className="modal-header">
            <div>
              <h2>{spot.brand} {spot.model}</h2>
              <span className="modal-year">{spot.year}</span>
            </div>
            <div className="modal-rarity" style={{ color: RARITY_COLORS[spot.rarity_tier] }}>
              {spot.rarity_tier?.toUpperCase()} • +{spot.points} pts
            </div>
          </div>
          
          <div className="modal-user">
            {spot.user_picture ? (
              <img src={spot.user_picture} alt={spot.user_name} />
            ) : (
              <div className="modal-user-placeholder">{spot.user_name?.[0]?.toUpperCase()}</div>
            )}
            <span>{spot.user_name}</span>
          </div>
          
          <div className="modal-comments">
            <h4>Commentaires ({comments.length})</h4>
            <form onSubmit={handleAddComment} className="comment-form">
              <input
                type="text"
                placeholder="Ajouter un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                data-testid="comment-input"
              />
              <button type="submit" disabled={loading} data-testid="comment-submit-btn">
                {loading ? "..." : "Envoyer"}
              </button>
            </form>
            <div className="comments-list">
              {comments.map(comment => (
                <div key={comment.comment_id} className="comment-item">
                  <strong>{comment.user_name}</strong>
                  <p>{comment.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App
function App() {
  const { user, token, loading, login, register, logout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedSpot, setSelectedSpot] = useState(null);

  const handleSpotCreated = () => {
    setActiveTab("feed");
    // Refresh user stats
    axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setUser(res.data)).catch(() => {});
  };

  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loader" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <AuthScreen onLogin={login} onRegister={register} />
      </div>
    );
  }

  return (
    <div className="app" data-testid="main-app">
      <div className="app-content">
        {activeTab === "feed" && <FeedScreen token={token} onOpenDetail={setSelectedSpot} />}
        {activeTab === "capture" && <CaptureScreen token={token} user={user} onSpotCreated={handleSpotCreated} />}
        {activeTab === "leaderboard" && <LeaderboardScreen token={token} user={user} />}
        {activeTab === "profile" && <ProfileScreen token={token} user={user} onLogout={logout} />}
      </div>
      
      <nav className="tab-bar" data-testid="tab-bar">
        <button 
          className={`tab-item ${activeTab === "feed" ? "active" : ""}`}
          onClick={() => setActiveTab("feed")}
          data-testid="tab-feed"
        >
          <Icons.Home />
          <span>Feed</span>
        </button>
        <button 
          className={`tab-item ${activeTab === "capture" ? "active" : ""}`}
          onClick={() => setActiveTab("capture")}
          data-testid="tab-capture"
        >
          <Icons.Camera />
          <span>Spot</span>
        </button>
        <button 
          className={`tab-item ${activeTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setActiveTab("leaderboard")}
          data-testid="tab-leaderboard"
        >
          <Icons.Trophy />
          <span>Rang</span>
        </button>
        <button 
          className={`tab-item ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
          data-testid="tab-profile"
        >
          <Icons.User />
          <span>Profil</span>
        </button>
      </nav>
      
      {selectedSpot && (
        <SpotDetailModal 
          spot={selectedSpot} 
          token={token} 
          onClose={() => setSelectedSpot(null)} 
        />
      )}
    </div>
  );
}

export default App;
