# Docker Deployment Guide for ReOrder Pro

This guide outlines the steps to deploy ReOrder Pro using Docker and Docker Compose on your cloud server. The entire stack (PostgreSQL database + unified Vite/Express backend) will be spun up together, and the database schema will be automatically pushed on startup.

## Prerequisites
- **Docker** and **Docker Compose** installed on your server.
- **Nginx Proxy Manager (NPM)** installed and running (or another reverse proxy).
- Your domain (`orders.kirknet.io`) pointing to your server's IP address.

---

## 1. Clone the Repository
SSH into your server and clone the application source code:

```bash
git clone https://github.com/kirkphillip605/ordering-app.git reorder-pro
cd reorder-pro
```

## 2. Set Up Environment Variables
We need to create the environment file that Docker Compose will use.

```bash
cp .env.example .env
```

Open `.env` in your text editor (e.g., `nano .env`) and configure the production secrets:
```env
# Change this to a secure random string!
JWT_SECRET="generate-a-long-random-string-here"
```

*(Note: `DATABASE_URL`, `FRONTEND_URL`, and `PORT` are already explicitly defined in `docker-compose.yml` so you don't strictly need them in the `.env` file unless you want to override the compose file defaults).*

## 3. Build and Start the Containers

Run the following command from the root of the project to build the Docker image and start the database and application containers in the background:

```bash
docker compose up -d --build
```

### What happens behind the scenes:
1. Docker pulls the PostgreSQL 15 image and starts the database container (`reorder-pro-db`).
2. Docker builds the application image (`reorder-pro-app`):
   - It installs dependencies and builds the Vite frontend.
   - It prunes development dependencies to keep the image lightweight.
3. The app container starts. The start script (`npm run start`) executes `npx drizzle-kit push` to automatically create/update your database tables, then launches the Express server on port `3001`.
4. The Express server serves both your API *and* the static frontend files.

You can verify the containers are running with:
```bash
docker compose ps
```

And check the application logs to ensure the database connected and the server started successfully:
```bash
docker compose logs -f app
```

## 4. Configure Nginx Proxy Manager

Now that the application is running and exposed on port `3001` of your host machine, you need to route external traffic to it securely.

1. Log into your **Nginx Proxy Manager** web interface.
2. Go to **Proxy Hosts** -> **Add Proxy Host**.
3. Configure the **Details** tab:
   - **Domain Names**: `orders.kirknet.io`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: Enter your server's public IP address (e.g., `157.230.238.68`). Do not use `localhost` or `127.0.0.1` as that will route to the NPM container itself. Using the public IP ensures NPM can reach the published port 3001 on the host machine.
   - **Forward Port**: `3001`
   - **Block Common Exploits**: Checked
   - **Websockets Support**: Checked
4. Configure the **SSL** tab:
   - **SSL Certificate**: Request a new SSL Certificate
   - **Force SSL**: Checked
   - **HTTP/2 Support**: Checked
   - **Email Address**: Your email for Let's Encrypt notifications
   - Check "I Agree to the Let's Encrypt Terms of Service"
5. Click **Save**.

## 5. Setup Your First Admin Account
Once the site is live at `https://orders.kirknet.io`, navigate to it in your browser. 

Since the database is fresh, you will need to register a new user account. Currently, the first user you create will be a `standard` user. To make them an `admin`:

1. SSH into your server.
2. Connect to the running database container:
```bash
docker exec -it reorder-pro-db psql -U reorder_user -d reorder_db
```
3. Update your user's role to admin (replace `your_username` with the username you just registered):
```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
\q
```
4. Refresh your browser. You will now see the **Users** tab where you can manage future accounts without needing the command line!
