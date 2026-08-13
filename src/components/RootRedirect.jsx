import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole, ROLES } from '../context/RoleContext';

/**
 * F-032 / décision 4 du Roi — aiguillage de la racine « / ».
 * Membre connecté → espace perso /me (action-first). Visiteur → /royaume (vitrine
 * publique). F-033 : un aperçu « en tant que Guest » se comporte aussi comme un
 * visiteur (atterrit sur /royaume), pour refléter fidèlement l'expérience Guest.
 * MainContent attend déjà la fin du chargement de l'auth avant de monter les Routes.
 */
const RootRedirect = () => {
    const { currentUser } = useAuth();
    const { role } = useRole();
    const isVisitor = !currentUser || role === ROLES.GUEST;
    return <Navigate to={isVisitor ? '/royaume' : '/me'} replace />;
};

export default RootRedirect;
