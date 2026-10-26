# InterviewEdge

InterviewEdge is a responsive static website backed by a Node.js/Express API. Public pages load interview-drive listings from Cloud SQL for MySQL. Admin sign-in uses bcrypt-verified credentials and a short-lived JWT in an HttpOnly cookie. Cloud Run hosts the API and protected admin page; Firebase Hosting serves the public files and rewrites API/admin-page requests to Cloud Run so cookies stay same-origin.

The existing site is a job/interview-drive portal. The migration preserves the listing fields and functionality, and adds Cloud SQL tables and APIs for interview questions, answers, categories, and registered job seekers. Existing Firestore records are not copied; see the cutover notes below.

## Local installation and run

Requirements: Node.js 20+, MySQL 8+, and (for a GCP database) the Cloud SQL Auth Proxy.

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env` (in PowerShell, run `Copy-Item .env.example .env`) and fill in the database, admin, and JWT values. `.env` is ignored by Git.
3. Generate a bcrypt hash in a terminal with `npm run hash-admin-password`, then place the printed hash in `ADMIN_PASSWORD_HASH`.
4. Create the MySQL database and user, then initialize the schema with `npm run db:init`.
5. Start the app using `npm run dev` or `npm start`.
6. Open `http://localhost:3000`. Job seekers can register at `/user-register.html`; admins sign in at `/admin-login.html`.

For a local Cloud SQL instance, run the Cloud SQL Auth Proxy using your instance connection name, then set `DB_HOST=127.0.0.1` and `DB_PORT=3306`. Do not use a static-only server such as Live Server: the same-origin Express API is required.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production` on Cloud Run; enables the Secure JWT cookie. |
| `PORT` | HTTP listen port; Cloud Run supplies this automatically. |
| `PUBLIC_ORIGINS` | Comma-separated exact site origins accepted for login and other state-changing requests. |
| `JWT_SECRET` | At least 32 random bytes used to sign JWTs. |
| `ADMIN_USERNAME` | Admin sign-in ID. |
| `ADMIN_PASSWORD_HASH` | bcrypt hash (cost 12 or greater); never store the plaintext password here. |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL database and least-privilege application user. |
| `DB_HOST`, `DB_PORT` | Local TCP connection settings. |
| `INSTANCE_CONNECTION_NAME` | Cloud SQL `PROJECT:REGION:INSTANCE` name on Cloud Run; uses `/cloudsql/...` socket. |
| `DB_CONNECTION_LIMIT` | Maximum MySQL connection pool size. |

Generate the hash interactively without echoing the password:

```text
npm run hash-admin-password
```

Generate a JWT secret (store the result only in `.env` locally and Secret Manager in production):

```text
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

The client does not receive the JWT, JWT secret, admin password/hash, or database credentials. The JWT is held in an `HttpOnly`, `SameSite=Strict` cookie; production cookies are also `Secure` and the token expires after one hour. Admin write endpoints require both a valid token and a same-origin request.

## Cloud SQL schema and API

`sql/schema.sql` creates:

- `interviews`: the current website’s company, role, date, type, location, experience, salary, application URL, description, skills, and optional listing-category fields.
- `categories`: categories for both listings and questions.
- `questions`: question text, answer text, category, difficulty, publication status, and timestamps.
- `users`: job-seeker profile and bcrypt password hash. Password hashes are never returned by the API.

The schema command creates tables only. It does **not** export or import existing Firestore records. The old Firestore data is left unchanged; after cutover, the new site reads Cloud SQL, which will be empty until new listings are added or a separate data migration is performed.

Public endpoints:

- `GET /api/listings`, `GET /api/listings/:id`, `GET /api/listings/:id/related`
- `GET /api/categories?type=listing|question`
- `GET /api/questions?page=1&pageSize=20&categoryId=...` (published questions only)
- `GET /api/questions/:id` (published questions only)

Admin endpoints require the JWT cookie:

- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/session`
- `GET|POST /api/admin/listings`, `PUT|DELETE /api/admin/listings/:id`
- `GET|POST /api/admin/questions`, `PUT|DELETE /api/admin/questions/:id`
- `GET|POST /api/admin/categories`, `PUT|DELETE /api/admin/categories/:id`
- `GET /api/admin/users` (registered job-seeker profiles)

User endpoints use a separate short-lived HttpOnly JWT cookie:

- `POST /api/user/register`, `POST /api/user/login`, `POST /api/user/logout`, `GET /api/user/session`
- `GET /api/user/dashboard` (current interview drives for the user's matching dashboard)

Job seekers register with their name, email, and password; phone, education, graduation year, skills, experience, and preferred location are optional profile fields. Users can view their own profile and relevant open interview drives at `/dashboard`; only admins can view all registered profiles at `/admin/users`.

JSON fields for questions are `question`, `answer`, `categoryId`, `difficulty` (`beginner`, `intermediate`, or `advanced`), and optional boolean `isPublished`. Create a question category first using `POST /api/admin/categories` with `{ "name": "Java", "type": "question" }`.

## Google Cloud setup and Cloud Run deployment

The commands below use `PROJECT_ID`, `REGION`, `INSTANCE`, and `SERVICE_ACCOUNT` as shell variables; replace them with your own values. Choose a region supported by both Cloud SQL and Cloud Run and use it consistently.

1. Select the GCP project, enable services, and create a Cloud Run runtime service account:

   ```sh
   gcloud config set project PROJECT_ID
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com
   gcloud iam service-accounts create interviewedge-runtime
   ```

   Set `SERVICE_ACCOUNT=interviewedge-runtime@PROJECT_ID.iam.gserviceaccount.com`. Grant it access to Cloud SQL:

   ```sh
   gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SERVICE_ACCOUNT" --role=roles/cloudsql.client
   ```

2. Create a Cloud SQL for MySQL 8 instance, database, and dedicated application account. Store the database password in Secret Manager; use a strong unique value.

   ```sh
   gcloud sql instances create INSTANCE --database-version=MYSQL_8_0 --region=REGION --tier=db-custom-1-3840
   gcloud sql databases create interviewedge --instance=INSTANCE
   ```

   In **Cloud SQL → Users**, create a MySQL user named `interviewedge_app` with a generated strong password. Store that value directly in Secret Manager and local `.env`; avoid placing it in a command-line argument or source file. Connect with an administrative MySQL account through the Cloud SQL Auth Proxy and run `npm run db:init` to create the schema. Grant the application user only data access to this database:

   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON interviewedge.* TO 'interviewedge_app'@'%';
   FLUSH PRIVILEGES;
   ```

   Set local `.env` to use this application account after the schema is initialized. Do not use the administrative database account in Cloud Run.

3. Create Secret Manager secrets for the JWT signing key, bcrypt hash, and Cloud SQL password. Add a secret version for each using a secure secret-input workflow; never put secret values in shell command arguments or source control. Grant the runtime account `roles/secretmanager.secretAccessor` on only those secrets.

   ```sh
   gcloud secrets create interviewedge-jwt-secret --replication-policy=automatic
   gcloud secrets create interviewedge-admin-password-hash --replication-policy=automatic
   gcloud secrets create interviewedge-sql-password --replication-policy=automatic
   gcloud secrets add-iam-policy-binding interviewedge-jwt-secret --member="serviceAccount:SERVICE_ACCOUNT" --role=roles/secretmanager.secretAccessor
   gcloud secrets add-iam-policy-binding interviewedge-admin-password-hash --member="serviceAccount:SERVICE_ACCOUNT" --role=roles/secretmanager.secretAccessor
   gcloud secrets add-iam-policy-binding interviewedge-sql-password --member="serviceAccount:SERVICE_ACCOUNT" --role=roles/secretmanager.secretAccessor
   ```

   Add versions from protected local files (keep them outside the repository and remove them after upload), for example:

   ```sh
   gcloud secrets versions add interviewedge-jwt-secret --data-file=PATH_TO_JWT_SECRET_FILE
   gcloud secrets versions add interviewedge-admin-password-hash --data-file=PATH_TO_BCRYPT_HASH_FILE
   gcloud secrets versions add interviewedge-sql-password --data-file=PATH_TO_DATABASE_PASSWORD_FILE
   ```

4. Deploy the server from this directory. `Dockerfile` binds to the Cloud Run port; the Cloud SQL socket is mounted by `--add-cloudsql-instances`.

   ```sh
   gcloud run deploy interviewedge-api --source . --region=REGION --allow-unauthenticated --service-account=SERVICE_ACCOUNT --add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE --set-env-vars=NODE_ENV=production,INSTANCE_CONNECTION_NAME=PROJECT_ID:REGION:INSTANCE,DB_NAME=interviewedge,DB_USER=interviewedge_app,ADMIN_USERNAME=admin,PUBLIC_ORIGINS=https://PROJECT_ID.web.app\,https://PROJECT_ID.firebaseapp.com --set-secrets=JWT_SECRET=interviewedge-jwt-secret:latest,ADMIN_PASSWORD_HASH=interviewedge-admin-password-hash:latest,DB_PASSWORD=interviewedge-sql-password:latest
   ```

   The Cloud Run service is internet reachable because public listing endpoints and the website need it; admin endpoints and the admin HTML remain JWT protected.

## Frontend hosting and same-origin API routing

`firebase.json` configures Firebase Hosting to serve the existing static pages and rewrite `/api/**`, `/admin`, and `/admin.html` to the Cloud Run service. This keeps the JWT cookie same-origin. The admin HTML is excluded from the static upload so it cannot bypass the backend access check. Firebase Hosting is used only for static delivery/routing; Firebase Authentication, Firestore, Firebase Admin SDK, and Firebase client SDKs are not used.

1. Install the Firebase CLI and select/create a Hosting site for your GCP project:

   ```sh
   npm install --global firebase-tools
   firebase login
   firebase use --add
   ```

2. In `firebase.json`, set the Cloud Run `serviceId` and `region` to the service and region deployed above. Ensure `PUBLIC_ORIGINS` in Cloud Run lists every exact Hosting/custom-domain origin (no paths or trailing slashes); redeploy Cloud Run after changing it.
3. Deploy the frontend:

   ```sh
   firebase deploy --only hosting
   ```

Use the resulting Hosting domain (or attach a custom domain) for the website. Since the API is reached via same-host rewrites, do not add a permissive CORS policy. Cloud Run's `NODE_ENV=production` enables secure cookies; HTTPS is required.

## Structure

- Root HTML, CSS, and public JS: existing InterviewEdge website and responsive UI.
- `index.js`, `detail.js`, and `backup-index/`: public pages now call the JSON API instead of Firestore.
- `admin.html`, `admin.css`, `admin.js`: protected existing listing dashboard.
- `admin-login.html`, `admin-login.js`: separate login form; it sends credentials to the server and never handles a token in JavaScript.
- `server.js`: Express API, JWT authentication, validation, Cloud SQL operations, and protected admin page.
- `database.js`: Cloud SQL MySQL connection pool, including Cloud Run socket support.
- `sql/schema.sql`, `scripts/init-db.js`: MySQL schema and schema initializer.
- `firebase.json`: Firebase Hosting static delivery and Cloud Run rewrites only.

## Cutover notes

The previous Firebase/Firestore data is not deleted, but this code no longer reads or writes it. Per the selected schema-only scope, no Firestore export/import has been performed. Before public cutover, initialize Cloud SQL, create the admin bcrypt hash and secrets, deploy the Cloud Run service, configure the Hosting rewrite, and add/restore the required listings through an authorized import or the admin panel. Test the login, admin CRUD, public list/detail endpoints, and question/category API before directing production traffic.


##Note 

This Branch is Created by Ram