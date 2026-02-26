# Guide d'accès à la base de données MongoDB - Street.OS

## 1. Via MongoDB Compass (Interface Graphique)

### Installation
- Télécharge MongoDB Compass : https://www.mongodb.com/try/download/compass
- Installe et lance l'application

### Connexion
- **Connection String** : `mongodb://localhost:27017`
- Note : En environnement de preview, la base est accessible localement dans le container.
- Pour accéder depuis l'extérieur, il faudra configurer un tunnel ou déployer avec une base accessible.

### Navigation
1. Connecte-toi avec le connection string
2. Sélectionne la base `test_database`
3. Tu verras les collections :
   - **users** : Tous les utilisateurs (nom, email, points, badges, is_admin, is_banned)
   - **spots** : Tous les spots de voitures (image, marque, modèle, rareté, points, likes)
   - **comments** : Tous les commentaires sur les spots
   - **user_sessions** : Les sessions actives (Google Auth)

### Opérations courantes dans Compass
- **Voir tous les users** : Clique sur la collection `users`
- **Rendre quelqu'un admin** : Trouve l'utilisateur > Edit > Ajoute `"is_admin": true`
- **Supprimer un user** : Trouve l'utilisateur > Clique sur le bouton poubelle
- **Filtrer** : Utilise la barre de filtre, ex: `{"is_admin": true}` pour voir les admins

---

## 2. Via mongosh (Terminal/Ligne de commande)

### Connexion
```bash
mongosh "mongodb://localhost:27017/test_database"
```

### Commandes utiles

#### Voir tous les utilisateurs
```javascript
db.users.find({}, {password_hash: 0}).pretty()
```

#### Rendre un utilisateur admin
```javascript
db.users.updateOne(
  { email: "mathischab78@gmail.com" },
  { $set: { is_admin: true } }
)
```

#### Bannir un utilisateur
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { is_banned: true } }
)
```

#### Voir le classement
```javascript
db.users.find({}, {name: 1, total_points: 1, spot_count: 1, _id: 0}).sort({total_points: -1})
```

#### Voir tous les spots
```javascript
db.spots.find({}, {image_base64: 0}).sort({created_at: -1}).pretty()
```

#### Compter les spots par rareté
```javascript
db.spots.aggregate([
  { $group: { _id: "$rarity_tier", count: { $sum: 1 } } }
])
```

#### Supprimer un utilisateur et ses données
```javascript
const userId = "user_xxxxxxxxx"
db.users.deleteOne({ user_id: userId })
db.spots.deleteMany({ user_id: userId })
db.comments.deleteMany({ user_id: userId })
db.user_sessions.deleteMany({ user_id: userId })
```

#### Ajouter un badge manuellement
```javascript
db.users.updateOne(
  { email: "mathischab78@gmail.com" },
  { $addToSet: { badges: "champion" } }
)
```

#### Retirer un badge
```javascript
db.users.updateOne(
  { email: "mathischab78@gmail.com" },
  { $pull: { badges: "champion" } }
)
```

#### Voir les stats globales
```javascript
print("Users:", db.users.countDocuments())
print("Spots:", db.spots.countDocuments())
print("Comments:", db.comments.countDocuments())
print("Admins:", db.users.countDocuments({is_admin: true}))
print("Banned:", db.users.countDocuments({is_banned: true}))
```

---

## 3. Collections & Structure

### users
```json
{
  "user_id": "user_xxxxx",
  "email": "example@mail.com",
  "name": "Nom",
  "password_hash": "...",
  "picture": "",
  "total_points": 150,
  "spot_count": 5,
  "badges": ["first_spot", "spotter_10"],
  "is_admin": false,
  "is_banned": false,
  "created_at": "2026-02-26T..."
}
```

### spots
```json
{
  "spot_id": "spot_xxxxx",
  "user_id": "user_xxxxx",
  "user_name": "Nom",
  "image_base64": "data:image/jpeg;base64,...",
  "brand": "Ferrari",
  "model": "488 GTB",
  "year": 2023,
  "rarity_tier": "hypercar",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "location_name": "Paris, France",
  "points": 100,
  "likes": ["user_xxx"],
  "like_count": 1,
  "comment_count": 2,
  "created_at": "2026-02-26T..."
}
```

### comments
```json
{
  "comment_id": "comment_xxxxx",
  "spot_id": "spot_xxxxx",
  "user_id": "user_xxxxx",
  "user_name": "Nom",
  "text": "Super spot !",
  "created_at": "2026-02-26T..."
}
```
