# Mettre SystaBokk en ligne sur Systalink — pas à pas

Durée : environ 45 minutes. Un seul produit Datacloud suffit : un **Cloud Server à Dakar**.
L'application, la base PostgreSQL et le HTTPS tournent tous sur ce serveur.

## 1. Acheter le serveur (règlement CADEV, art. 6 et 8)

Sur https://platform.systalink.com, depuis votre espace client :

- Produit : **Cloud Server (VPS) — localisation Dakar** (les VPS hors Dakar n'ont pas la remise).
- Taille : **2 vCPU et 4 Go de RAM** conseillés (2 Go minimum, voir l'étape 4 dans ce cas).
- Système : **Ubuntu 24.04** (ou Debian 12).
- **Appliquez le code promo de l'équipe (40 %)** avant de payer.
- **Gardez la facture** : elle prouve l'achat lors de la soumission.

Notez l'**adresse IP** du serveur et le mot de passe root (ou ajoutez votre clé SSH).

## 2. Pointer le domaine

Dans la zone DNS de votre domaine (chez Systalink si vous l'y avez), créez :

| Type | Nom | Valeur |
| --- | --- | --- |
| A | `systabokk` | l'IP du serveur |

Le site sera alors `https://systabokk.votredomaine.com`. Comptez quelques minutes de propagation.

## 3. Envoyer le code sur le serveur (depuis Windows, PowerShell)

```powershell
cd "C:\Users\Gael_\Desktop\hackaton systalink"
scp systabokk.zip root@IP_DU_SERVEUR:/root/
ssh root@IP_DU_SERVEUR
```

## 4. Préparer le serveur (dans la session SSH)

```bash
apt update && apt install -y unzip
curl -fsSL https://get.docker.com | sh          # installe Docker

# Seulement si le serveur a 2 Go de RAM : ajouter 2 Go de mémoire d'échange pour la compilation
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

unzip systabokk.zip && cd systabokk
```

## 5. Configurer et lancer

```bash
./scripts/preparer-env.sh systabokk.votredomaine.com   # crée .env avec des secrets aléatoires
./deploy.sh                                             # construit, migre la base, démarre, vérifie
docker compose run --rm migrate npm run db:seed         # données de démo + compte Pass Jury (une fois)
```

Ouvrez `https://systabokk.votredomaine.com` : le certificat HTTPS est obtenu automatiquement.

## 6. Vérifier

- `https://…/api/ready` doit répondre `{"statut":"pret"}`.
- Page **Pass Jury** → « Entrer » → ouvrir une API → « Essayer ».
- Couper le fournisseur A sur la page Pass Jury, puis essayer la prise Paiement : la réponse indique « Servi par : paiement-b ».

## Commandes utiles

| Besoin | Commande |
| --- | --- |
| Voir les journaux | `docker compose logs -f app` |
| Redémarrer | `docker compose restart app` |
| Mettre à jour après un nouveau zip | `unzip -o ../systabokk.zip -d .. && ./deploy.sh` |
| Sauvegarder la base | `docker compose exec db pg_dump -U systabokk systabokk > sauvegarde.sql` |

> `deploy.sh` utilise `git pull` si le dossier est un dépôt git ; sinon il continue sans.
