# Workflow générique — Cahier de test (Firebase / SPA)

## 🎯 Objectif
Générer et maintenir un **cahier de test** (test plan + test cases) à partir du **périmètre fonctionnel** documenté (SSOT), avec **mise à jour automatique** lors des évolutions.

---

## 🧠 Architecture KD 2997
L’application repose sur :
- **Frontend** : React 19 (Vite)
- **Database** : Firestore (Real-time)
- **Auth** : Firebase Auth (RBAC)
- **Ingestion** : Cloud Functions / local scripts (XLSX parsing)

---

## ✅ Éléments de test prioritaires
- **Auth & Roles** : Accès King / Officer / Warrior.
- **Data Integrity** : Parsing XLSX → Firestore sans perte.
- **Performance** : Temps de réponse des graphiques (Recharts).
- **Internationalisation** : Switcher de langue (8 langues).
- **Responsive** : Utilisation mobile vs desktop.

---

Refer to [testeur.md](file:///.agent/rules/testeur.md) for detailed identities and matrix format.
