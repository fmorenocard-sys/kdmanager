import React from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import { XCircle } from './icons';

/**
 * ModuleDisabled — écran affiché quand on atteint la route d'un module optionnel
 * désactivé pour cette instance (F-023 / BR-015). Explicite, jamais un 404 ni
 * une redirection silencieuse. Mécanisme de présentation, pas de sécurité.
 */
const ModuleDisabled = () => {
    const { t } = useTranslation();
    return (
        <EmptyState
            icon={XCircle}
            title={t('common.module_disabled')}
            description={t('common.module_disabled_hint')}
            className="min-h-[60vh]"
        />
    );
};

export default ModuleDisabled;
