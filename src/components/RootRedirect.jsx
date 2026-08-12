import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * F-032 / décision 4 du Roi — aiguillage de la racine « / ».
 * Connecté → espace perso /me (action-first). Visiteur → /royaume (vitrine
 * publique du royaume). MainContent attend déjà la fin du chargement de l'auth
 * avant de monter les Routes, donc currentUser est fiable ici.
 */
const RootRedirect = () => {
    const { currentUser } = useAuth();
    return <Navigate to={currentUser ? '/me' : '/royaume'} replace />;
};

export default RootRedirect;
