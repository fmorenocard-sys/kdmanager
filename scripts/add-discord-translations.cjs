const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const languages = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory());

const newKeys = {
    en: {
        "linked_accounts": "Linked Accounts",
        "connected_via_discord": "Connected via Discord SSO",
        "main_account": "Main Account",
        "linked_account": "Linked Account",
        "sync_roles_desc": "Force update your permissions from the Discord server",
        "sync_roles": "Sync Roles",
        "discord_linked": "Discord Linked",
        "link_discord_desc": "Link your Discord account to synchronize your in-app roles.",
        "link_discord_account": "Link my Discord account"
    },
    es: {
        "linked_accounts": "Cuentas vinculadas",
        "connected_via_discord": "Conectado vía Discord SSO",
        "main_account": "Cuenta principal",
        "linked_account": "Cuenta vinculada",
        "sync_roles_desc": "Forzar la actualización de permisos desde el servidor de Discord",
        "sync_roles": "Sincronizar roles",
        "discord_linked": "Discord Vinculado",
        "link_discord_desc": "Vincula tu cuenta de Discord para sincronizar tus roles en la aplicación.",
        "link_discord_account": "Vincular mi cuenta de Discord"
    },
    de: {
        "linked_accounts": "Verknüpfte Konten",
        "connected_via_discord": "Verbunden über Discord SSO",
        "main_account": "Hauptkonto",
        "linked_account": "Verknüpftes Konto",
        "sync_roles_desc": "Aktualisierung der Berechtigungen vom Discord-Server erzwingen",
        "sync_roles": "Rollen synchronisieren",
        "discord_linked": "Discord Verknüpft",
        "link_discord_desc": "Verknüpfe dein Discord-Konto, um deine In-App-Rollen zu synchronisieren.",
        "link_discord_account": "Mein Discord-Konto verknüpfen"
    },
    pl: {
        "linked_accounts": "Połączone konta",
        "connected_via_discord": "Połączono przez Discord SSO",
        "main_account": "Konto główne",
        "linked_account": "Połączone konto",
        "sync_roles_desc": "Wymuś aktualizację uprawnień z serwera Discord",
        "sync_roles": "Synchronizuj role",
        "discord_linked": "Discord Połączony",
        "link_discord_desc": "Połącz swoje konto Discord, aby zsynchronizować role w aplikacji.",
        "link_discord_account": "Połącz moje konto Discord"
    },
    tr: {
        "linked_accounts": "Bağlı Hesaplar",
        "connected_via_discord": "Discord SSO ile Bağlanıldı",
        "main_account": "Ana Hesap",
        "linked_account": "Bağlı Hesap",
        "sync_roles_desc": "İzinleri Discord sunucusundan zorla güncelle",
        "sync_roles": "Rolleri Senkronize Et",
        "discord_linked": "Discord Bağlı",
        "link_discord_desc": "Uygulama içi rollerinizi senkronize etmek için Discord hesabınızı bağlayın.",
        "link_discord_account": "Discord hesabımı bağla"
    },
    uk: {
        "linked_accounts": "Пов'язані акаунти",
        "connected_via_discord": "Підключено через Discord SSO",
        "main_account": "Основний акаунт",
        "linked_account": "Пов'язаний акаунт",
        "sync_roles_desc": "Примусово оновити дозволи з сервера Discord",
        "sync_roles": "Синхронізувати ролі",
        "discord_linked": "Discord Пов'язано",
        "link_discord_desc": "Пов'яжіть свій акаунт Discord, щоб синхронізувати свої ролі в додатку.",
        "link_discord_account": "Пов'язати мій акаунт Discord"
    },
    vi: {
        "linked_accounts": "Tài khoản Đã liên kết",
        "connected_via_discord": "Đã kết nối qua Discord SSO",
        "main_account": "Tài khoản Chính",
        "linked_account": "Tài khoản Đã liên kết",
        "sync_roles_desc": "Buộc cập nhật quyền của bạn từ máy chủ Discord",
        "sync_roles": "Đồng bộ Vai trò",
        "discord_linked": "Discord Đã liên kết",
        "link_discord_desc": "Liên kết tài khoản Discord của bạn để đồng bộ vai trò trong ứng dụng.",
        "link_discord_account": "Liên kết tài khoản Discord của tôi"
    },
    ar: {
        "linked_accounts": "الحسابات المرتبطة",
        "connected_via_discord": "متصل عبر Discord SSO",
        "main_account": "الحساب الرئيسي",
        "linked_account": "حساب مرتبط",
        "sync_roles_desc": "فرض تحديث الصلاحيات من سيرفر ديسكورد",
        "sync_roles": "مزامنة الأدوار",
        "discord_linked": "تم ربط Discord",
        "link_discord_desc": "اربط حساب Discord الخاص بك لمزامنة أدوارك في التطبيق.",
        "link_discord_account": "ربط حساب Discord الخاص بي"
    }
};

languages.forEach(lang => {
    const filePath = path.join(localesDir, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!data.profile) data.profile = {};

        let keysToAdd = newKeys[lang] || newKeys['en'];

        // Merge keys
        Object.assign(data.profile, keysToAdd);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log(`Updated translations for ${lang}`);
    }
});
