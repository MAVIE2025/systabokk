/**
 * Contenu du guide de première visite.
 * Chaque étape vise un élément par son attribut data-guide (ou un id de champ).
 * Une étape dont l'élément n'est pas affiché est simplement sautée :
 * une même liste sert donc aux états « connecté » et « non connecté ».
 */

export type EtapeGuide = { cible?: string; titre: string; texte: string };

const g = (cle: string) => `[data-guide="${cle}"]`;

/** Présentation du menu : montrée une seule fois, au premier guide vu, quelle que soit la page. */
export const ETAPES_MENU: EtapeGuide[] = [
  { cible: g("nav-logo"), titre: "SystaBokk", texte: "Le logo ramène toujours à l'accueil." },
  { cible: g("nav-accueil"), titre: "Accueil", texte: "La page de présentation : le concept en animation et les chiffres réels de la plateforme." },
  { cible: g("nav-catalogue"), titre: "Catalogue", texte: "Toutes les API publiées, de tous types (paiement, SMS, documents, cartes…), avec leur prix par appel." },
  { cible: g("nav-publier"), titre: "Publier", texte: "Mettez votre propre API en ligne, fixez son prix et gagnez des FCFA à chaque appel." },
  { cible: g("nav-agents"), titre: "Agents IA", texte: "Branchez Claude, Cursor ou un autre agent IA : il trouve les API et les paie lui-même avec votre clé." },
  { cible: g("nav-jury"), titre: "Pass Jury", texte: "Un accès de démonstration avec 5 000 FCFA de test, pour tout essayer sans créer de compte." },
  { cible: g("nav-admin"), titre: "Admin", texte: "Visible seulement pour les administrateurs Systalink : ouvre le tableau de bord de la plateforme." },
  { cible: g("nav-compte"), titre: "Mon compte", texte: "Votre solde, vos gains, vos appels et vos API publiées. Sans compte, vous y trouvez la connexion et l'inscription." },
  { cible: g("nav-deconnexion"), titre: "Me déconnecter", texte: "Ferme votre session sur cet appareil. Pour revenir, il suffit de votre clé SystaBokk." },
  { cible: g("nav-systalink"), titre: "Produits Systalink", texte: "Ouvre le site de Systalink (dans un nouvel onglet) : hébergement, bases de données, domaines… où tournent les API." },
  { cible: g("guide-revoir"), titre: "Revoir le guide", texte: "Ce bouton relance le guide de la page où vous êtes, à tout moment." },
];

export const GUIDES: { cle: string; correspond: (chemin: string) => boolean; etapes: EtapeGuide[] }[] = [
  {
    cle: "accueil",
    correspond: (c) => c === "/",
    etapes: [
      { titre: "Bienvenue sur SystaBokk 👋", texte: "La place de marché des API africaines : vous publiez une API, chaque appel vous paie en FCFA. Ce guide vous présente chaque élément en 1 minute. Vous pouvez le passer à tout moment." },
      { cible: g("accueil-titre"), titre: "L'idée en une phrase", texte: "Votre code peut vous rapporter de l'argent : chaque fois qu'un développeur ou une IA utilise votre API, vous êtes payé." },
      { cible: g("accueil-anim"), titre: "Le concept en animation", texte: "4 temps qui tournent en boucle : publier, être payé, la bascule automatique en cas de panne, et l'agent IA qui paie lui aussi." },
      { cible: g("accueil-gains"), titre: "Les gains en direct", texte: "Pendant l'animation, ces compteurs montrent ce que gagnent Aminata et Moussa à chaque appel (75 % du prix, la plateforme garde 25 %)." },
      { cible: g("accueil-explorer"), titre: "Explorer les API", texte: "Ouvre le catalogue pour trouver une API et l'essayer." },
      { cible: g("accueil-publier"), titre: "Publier mon API", texte: "Ouvre le formulaire pour mettre votre API en ligne. Il faut un compte (gratuit)." },
      { cible: g("accueil-jury"), titre: "Essayer avec le Pass Jury", texte: "Le moyen le plus rapide de tout tester, sans inscription." },
      { cible: g("accueil-video"), titre: "La vidéo de présentation", texte: "40 secondes pour comprendre SystaBokk avec une histoire concrète : Aminata publie, Issa utilise, tout le monde est payé. Elle s'ouvre en grand ; Échap pour la fermer." },
      { cible: g("accueil-chiffres"), titre: "Les chiffres réels", texte: "Nombre d'API, de développeurs, d'appels traités et total versé aux créateurs. Ils viennent directement de la base, rien n'est inventé." },
      { cible: g("accueil-mcp"), titre: "Pour les agents IA", texte: "SystaBokk parle aussi aux IA (protocole MCP). Cliquez pour voir comment brancher la vôtre." },
    ],
  },
  {
    cle: "catalogue",
    correspond: (c) => c === "/catalogue",
    etapes: [
      { cible: g("cat-recherche"), titre: "Rechercher", texte: "Tapez un mot (ex. « SMS », « facture ») puis Entrée : la recherche porte sur le nom et la description." },
      { cible: g("cat-filtres"), titre: "Filtrer par catégorie", texte: "Cliquez une catégorie pour n'afficher que ses API. Le chiffre indique combien il y en a. « Toutes » enlève le filtre." },
      { cible: g("cat-liste"), titre: "Les API", texte: "Chaque carte donne la catégorie, le nom, ce que fait l'API, son auteur, les pays couverts et le nombre d'appels. Cliquez pour ouvrir sa fiche." },
      { cible: g("cat-prix"), titre: "Le prix par appel", texte: "Ce que coûte un appel, en FCFA. Il est débité de votre solde seulement si l'appel réussit." },
      { cible: g("cat-prise"), titre: "Prise standard", texte: "Plusieurs fournisseurs pour le même service. Si l'un tombe en panne, SystaBokk passe automatiquement au suivant." },
    ],
  },
  {
    cle: "fiche-api",
    correspond: (c) => c.startsWith("/catalogue/"),
    etapes: [
      { cible: g("api-retour"), titre: "Retour", texte: "Revient à la liste du catalogue." },
      { cible: g("api-auteur"), titre: "Qui la fournit", texte: "Le créateur de l'API, son pays, les pays couverts et le lien vers sa documentation s'il en a une." },
      { cible: g("api-prix"), titre: "Prix par appel", texte: "Montant débité à chaque appel réussi. 75 % vont au créateur, 25 % à la plateforme." },
      { cible: g("api-fiabilite"), titre: "Fiabilité mesurée", texte: "Nombre d'appels, taux de réussite et temps de réponse sur 7 jours, calculés sur les vrais appels." },
      { cible: g("api-prise"), titre: "Ordre de bascule", texte: "Les fournisseurs de cette prise, dans l'ordre où SystaBokk les essaie en cas de panne." },
      { cible: g("api-curl"), titre: "L'appeler depuis votre code", texte: "Exemple prêt à copier. Remplacez VOTRE_CLE par votre clé SystaBokk : la même clé marche pour toutes les API." },
      { cible: g("api-essayer"), titre: "Essayer maintenant", texte: "Lance un vrai appel depuis le site et affiche la réponse, le prix payé et votre nouveau solde. Il faut être connecté (ou utiliser le Pass Jury)." },
    ],
  },
  {
    cle: "publier",
    correspond: (c) => c === "/publier",
    etapes: [
      { cible: g("pub-compte"), titre: "Un compte est nécessaire", texte: "Pour publier, créez un compte (30 secondes) ou connectez-vous avec votre clé. Le Pass Jury sert seulement à essayer." },
      { cible: "#name", titre: "Nom de l'API", texte: "Un nom court et clair, tel qu'il apparaîtra dans le catalogue. 60 caractères au plus." },
      { cible: "#description", titre: "Ce qu'elle fait", texte: "Une ou deux phrases pour les autres développeurs : ce que l'API reçoit et ce qu'elle renvoie." },
      { cible: "#category", titre: "Catégorie", texte: "Où la ranger dans le catalogue. Un exemple s'affiche sous la liste quand vous choisissez." },
      { cible: "#priceFcfa", titre: "Prix par appel", texte: "En FCFA, nombre entier, 4 au minimum. Vous recevez 75 %, la plateforme garde 25 %. Ex. : 20 FCFA → 15 pour vous." },
      { cible: g("pub-pays"), titre: "Pays couverts", texte: "Cochez les pays où votre API fonctionne (numéros, opérateurs, documents…). Au moins un." },
      { cible: "#upstreamUrl", titre: "Adresse de votre API", texte: "L'adresse https où tourne votre API, idéalement sur Systalink. SystaBokk y relaie les appels. Les adresses privées ou locales sont refusées par sécurité." },
      { cible: "#docUrl", titre: "Documentation (facultatif)", texte: "Un lien vers la doc de votre API. Il s'affichera sur sa fiche." },
      { cible: "#priseSlug", titre: "Prise standard (facultatif)", texte: "Si votre API suit l'interface d'une prise (paiement, SMS…), elle peut servir de relais quand un autre fournisseur tombe. Sinon, laissez « Aucune »." },
      { cible: "#exampleMethod", titre: "Méthode de l'exemple", texte: "GET pour une simple lecture, POST si l'appel envoie des données. Sert au bouton « Essayer » de la fiche." },
      { cible: "#examplePath", titre: "Chemin ou paramètres", texte: "Ce qui s'ajoute à l'adresse pour l'exemple, ex. « ?texte=Bonjour » ou « /traductions »." },
      { cible: "#exampleBody", titre: "Corps JSON", texte: "Seulement en POST : les données envoyées, au format JSON, ex. { \"texte\": \"Bonjour\" }." },
      { cible: g("pub-bouton"), titre: "Publier", texte: "SystaBokk vérifie le formulaire et l'adresse, puis l'API entre aussitôt dans le catalogue." },
      { cible: g("pub-adresse"), titre: "Votre API est en ligne", texte: "L'adresse à donner à vos utilisateurs. Chaque appel crédite votre portefeuille." },
    ],
  },
  {
    cle: "inscription",
    correspond: (c) => c === "/inscription",
    etapes: [
      { cible: "#name", titre: "Nom", texte: "Votre nom ou celui de votre structure. Il s'affiche comme auteur de vos API." },
      { cible: "#email", titre: "E-mail", texte: "Une adresse valide, une seule fois par compte. Elle ne s'affiche pas publiquement." },
      { cible: "#country", titre: "Pays", texte: "Le pays d'où vous publiez. Il apparaît à côté de votre nom." },
      { cible: g("ins-bouton"), titre: "Créer mon compte", texte: "Crée votre compte, vous connecte et vous offre 1 000 FCFA de crédit de test." },
      { cible: g("ins-cle"), titre: "Votre clé SystaBokk", texte: "Elle n'est affichée qu'une fois : gardez-la précieusement. Elle sert à appeler toutes les API et à vous reconnecter." },
      { cible: g("ins-copier"), titre: "Copier la clé", texte: "Copie la clé dans le presse-papiers pour la coller dans un endroit sûr." },
      { cible: g("ins-espace"), titre: "Aller à mon espace", texte: "Ouvre votre compte : solde, gains, appels et API publiées." },
    ],
  },
  {
    cle: "espace",
    correspond: (c) => c === "/espace",
    etapes: [
      { cible: "#cle", titre: "Votre clé", texte: "Collez la clé reçue à l'inscription (elle commence par sbk_). C'est votre seul identifiant : pas de mot de passe." },
      { cible: g("cnx-bouton"), titre: "Se connecter", texte: "Vérifie la clé et ouvre votre compte." },
      { cible: g("esp-creer"), titre: "Pas encore de compte ?", texte: "Créez-le en 30 secondes, 1 000 FCFA de test offerts." },
      { cible: g("nav-admin"), titre: "Admin", texte: "Visible seulement pour les administrateurs Systalink : ouvre le tableau de bord de la plateforme." },
  { cible: g("nav-compte"), titre: "Mon compte", texte: "Vous êtes connecté : le menu affiche votre solde. Cliquez ici à tout moment pour revenir sur cette page." },
      { cible: g("nav-deconnexion"), titre: "Me déconnecter", texte: "Ferme votre session sur cet appareil. Pour revenir, il suffira de votre clé SystaBokk." },
      { cible: g("esp-admin"), titre: "Accès administrateur", texte: "Votre compte a le rôle admin : ce bandeau ouvre l'espace Systalink (comptes, clés, API, gains)." },
      { cible: g("esp-cle"), titre: "Votre identité", texte: "Le début de votre clé (jamais affichée en entier) et votre pays." },
      { cible: g("esp-solde"), titre: "Solde du portefeuille", texte: "L'argent disponible pour appeler des API. Chaque appel réussi en débite le prix." },
      { cible: g("esp-recharger"), titre: "Recharger (test)", texte: "Ajoute 2 000 FCFA de test. En production, ce sera une recharge Mobile Money." },
      { cible: g("esp-gagne"), titre: "Gagné avec mes API", texte: "Le total reçu grâce aux appels de vos API (75 % de chaque appel)." },
      { cible: g("esp-appels"), titre: "Mes appels", texte: "Combien d'appels vous avez passés et combien ils vous ont coûté." },
      { cible: g("esp-apis"), titre: "Mes API publiées", texte: "Pour chacune : catégorie, prix, nombre d'appels et gains. Le bouton ouvre le formulaire de publication." },
      { cible: g("esp-explorer"), titre: "Explorer le catalogue", texte: "Trouvez d'autres API à utiliser dans vos projets." },
    ],
  },
  {
    cle: "jury",
    correspond: (c) => c === "/jury",
    etapes: [
      { cible: g("jury-entrer"), titre: "Entrer avec le Pass Jury", texte: "Vous connecte au compte de démonstration avec 5 000 FCFA de test. Aucun argent réel." },
      { cible: g("jury-solde"), titre: "Solde de démonstration", texte: "Il baisse à chaque appel réussi : vous voyez le paiement à l'appel en vrai." },
      { cible: g("jury-etape1"), titre: "1. Appeler une API", texte: "Ouvrez une de ces fiches et cliquez sur « Essayer » : l'appel est réel, facturé, et son créateur est payé." },
      { cible: g("jury-etape2"), titre: "2. Provoquer une panne", texte: "Mettez un fournisseur en panne, puis essayez la prise : SystaBokk bascule tout seul sur le suivant." },
      { cible: g("jury-pannes"), titre: "Les interrupteurs de panne", texte: "Chaque bouton met en panne ou remet en service un fournisseur de démonstration." },
      { cible: g("jury-etape3"), titre: "3. Laisser une IA payer", texte: "Branchez un agent IA avec la clé du Pass Jury : il paie ses appels lui-même." },
      { cible: g("jury-etape4"), titre: "4. Suivre l'argent", texte: "L'accueil affiche en direct les appels traités et les FCFA versés aux créateurs." },
    ],
  },
  {
    cle: "agents",
    correspond: (c) => c === "/agents",
    etapes: [
      { cible: g("ag-chiffres"), titre: "Les chiffres des agents", texte: "Appels payés par des IA, FCFA dépensés, et l'adresse du serveur MCP à donner à votre agent." },
      { cible: g("ag-outils"), titre: "Les outils de l'agent", texte: "Ce que l'IA sait faire sur SystaBokk : chercher une API, l'appeler, appeler une prise, consulter le solde." },
      { cible: g("ag-config"), titre: "Brancher votre IA", texte: "Copiez la commande (Claude Code) ou la configuration (Cursor…), en remplaçant VOTRE_CLE_SYSTABOKK par votre clé." },
      { cible: g("ag-exemple"), titre: "Exemple de conversation", texte: "Ce que donne une vraie demande : l'IA choisit les API, les appelle et paie en FCFA." },
    ],
  },
  {
    cle: "admin",
    correspond: (c) => c === "/admin",
    etapes: [
      { titre: "Espace administrateur", texte: "Le tableau de bord de Systalink pour piloter SystaBokk. Il n'existe que pour les comptes admin : pour les autres, cette adresse renvoie « page introuvable ». Chaque action est inscrite au journal." },
      { cible: g("adm-onglets"), titre: "Les 5 sections", texte: "Vue d'ensemble, Comptes, API, Gains de la plateforme et Journal. Relancez le guide (bouton ?) dans chaque section pour le détail." },
      { cible: g("adm-onglet-comptes"), titre: "Comptes", texte: "Tous les développeurs : bloquer ou débloquer, générer une nouvelle clé (clé perdue), donner ou retirer l'accès admin." },
      { cible: g("adm-onglet-api"), titre: "API", texte: "Toutes les API publiées : suspendre, réactiver ou supprimer." },
      { cible: g("adm-onglet-gains"), titre: "Gains de la plateforme", texte: "Les 25 % de commission encaissés, ce qui a déjà été retiré, et le formulaire de retrait." },
      { cible: g("adm-onglet-journal"), titre: "Journal", texte: "Qui a fait quoi et quand : la trace de toutes les actions admin." },
      { cible: g("adm-kpi"), titre: "Les chiffres clés", texte: "Développeurs, API, appels, volume payé, part versée aux créateurs et commissions de la plateforme, en direct depuis la base." },
      { cible: g("adm-top"), titre: "Les API qui rapportent le plus", texte: "Classées par volume payé : utile pour repérer les créateurs à mettre en avant." },
      { cible: g("adm-recherche"), titre: "Rechercher", texte: "Tapez un nom, un e-mail ou un nom d'API puis Entrée pour filtrer la liste." },
      { cible: g("adm-comptes"), titre: "La liste des comptes", texte: "Pour chacun : e-mail, pays, début de la clé active, solde, gains, nombre d'API et statut." },
      { cible: g("adm-statut"), titre: "Statut", texte: "Actif, bloqué (avec le motif) et admin le cas échéant." },
      { cible: g("adm-bloquer"), titre: "Bloquer / Débloquer", texte: "Bloquer demande un motif. Le compte ne peut plus se connecter, sa clé est refusée partout (site, API, agents IA) et ses API sont masquées. Débloquer rétablit tout." },
      { cible: g("adm-cle"), titre: "Nouvelle clé (clé perdue)", texte: "Les clés ne sont jamais stockées en clair, personne ne peut les relire. Ce bouton en génère une nouvelle à transmettre au développeur ; l'ancienne cesse aussitôt de marcher. Deux clics pour confirmer." },
      { cible: g("adm-role"), titre: "Rôle admin", texte: "Donne ou retire l'accès à cet espace. Vous ne pouvez pas modifier votre propre compte." },
      { cible: g("adm-apis"), titre: "La liste des API", texte: "Nom, adresse réelle, auteur, catégorie, prix, appels et statut (active, suspendue, masquée, supprimée)." },
      { cible: g("adm-suspendre"), titre: "Suspendre / Réactiver", texte: "Une API suspendue disparaît du catalogue et ne peut plus être appelée, mais reste réactivable. Son auteur voit « suspendue par Systalink »." },
      { cible: g("adm-supprimer"), titre: "Supprimer", texte: "Retire l'API définitivement du catalogue et de l'espace de son auteur. L'historique des appels et des paiements est conservé. Deux clics pour confirmer." },
      { cible: g("adm-solde"), titre: "Solde de la plateforme", texte: "Commissions encaissées (25 % de chaque appel), déjà retirées, et disponibles." },
      { cible: "#montant", titre: "Montant", texte: "En FCFA, 100 au minimum, sans dépasser le disponible. Prérempli avec tout le disponible." },
      { cible: "#moyen", titre: "Vers", texte: "Où envoyer l'argent : Orange Money, Moov Money, Wave, virement bancaire ou crédits Systalink." },
      { cible: "#reference", titre: "Référence", texte: "Le numéro de l'opération (reçu Mobile Money, virement…) pour la comptabilité." },
      { cible: g("adm-retrait-bouton"), titre: "Enregistrer le retrait", texte: "Inscrit le retrait au grand livre et au journal. Deux retraits simultanés ne peuvent jamais dépasser le disponible." },
      { cible: g("adm-historique"), titre: "Historique des retraits", texte: "Tous les retraits déjà faits, avec la date, le moyen et la référence." },
      { cible: g("adm-journal"), titre: "Le journal", texte: "Chaque action admin : date, auteur, action, compte ou API visé, détails (motif de blocage, montant…)." },
    ],
  },
];