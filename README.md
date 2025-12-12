# MoodGraph

MoodGraph is a personal mood tracking application via a Telegram bot. It allows users to log their mood, visualize all entries on a graph, and aggregate data by day, week, or month for better insights. Access to user graphs is invite-based, and each graph can have custom access levels for different users.

---

## 🚀 Features

* Track mood via Telegram bot
* Visualize entries on graphs
* Aggregate moods by day, week, or month
* Invite-only access to user graphs
* Customizable access levels for each graph

---

## 📦 Running MoodGraph

### Recommended: Docker

Pull the latest Docker image:

```bash
docker pull rdindaclub/moodgraph:latest
```

Run the container:

```bash
docker run -d --name moodgraph \
  -p 3000:3000 \
  -e TG_TOKEN=<your-tgbot-token> \
  -e LOCALE=en \
  -v moodgraph_data:/data \
  rdindaclub/moodgraph:latest
```


Available parameters:

| Parameter  | Default               | Description                                           |
| ---------- | --------------------- | ----------------------------------------------------- |
| `TG_TOKEN` | `Null`                | Telegram bot token                                    |
| `WEB_PORT` | `3000`                | Port for the web interface                            |
| `DOMAIN`   | `https://example.com` | Domain name, used for creating invites (can be blank) |
| `LOCALE`   | `ru`                  | Language: `en` (English) or `ru` (Russian)            |

---

### Alternative: Node.js Setup

<details>
<summary>Click to expand</summary>

1. Clone the repository:

```bash
git clone https://github.com/RDindahouse/MoodGraph.git
cd moodgraph
```

2. Install Node.js (v24 recommended)
3. Install dependencies:

```bash
npm install
```

4. Start the application:

```bash
npm run start-all
```

You can also build a Docker image locally:

```bash
docker compose build --no-cache
docker compose up -d
```
</details>

---

## 🔑 Admin Panel

After starting the app:

1. Log in to the admin panel: [https://localhost:3000/admin.html](https://localhost:3000/admin.html)

   * Default credentials: `admin/admin`
   * **Change the password immediately.**
2. Generate a token in the admin panel to link your Telegram bot.
3. Link your bot with:

```text
/link <token>
```

---

## 🤖 Telegram Bot Commands

<details>
<summary>Click to expand commands</summary>

* `/start` — Shows all available commands
* `/m` — Quick mood entry
* `/mood` — Mood entry with media
* `/board` — Select board
* `/link <token>` — Link Telegram account

**Format for mood entry:**

```
/mood <value> [comment]
/m <value> [comment]
```
</details>

## 📄 License

This project is licensed under the [GNU General Public License v2.0](LICENSE).

