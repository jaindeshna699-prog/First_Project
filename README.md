# 🍱 Surplus-to-Shelter

> **Turning surplus food into someone's next meal.**

Surplus-to-Shelter is a full-stack web platform designed to connect **food donors, shelters/NGOs, and volunteers** to make surplus food redistribution faster, easier, and more organized.

The platform focuses on reducing food waste by helping donors share surplus food and enabling nearby recipient organizations to coordinate collection and delivery.



## ✨ Features

* 🥘 **Food Donation Management** — Donors can create and manage surplus food listings.
* 📍 **Location-Based Matching** — Helps connect available food with nearby recipients.
* 🏠 **Shelter & NGO Management** — Recipient organizations can manage their requirements.
* 🚗 **Pickup Coordination** — Supports coordination between donors, recipients, and volunteers.
* ⚡ **Real-Time Updates** — Uses Socket.IO for real-time communication.
* 🗺️ **Interactive Maps** — Location and map functionality using Leaflet.
* 📊 **Impact Dashboard** — Visualizes food rescue and impact-related data.
* 🔐 **Authentication** — Secure user authentication using JWT and password hashing.
* 📧 **Email Notifications** — Supports email communication through Nodemailer.

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* React Router
* Tailwind CSS
* Axios
* Socket.IO Client
* Leaflet & React-Leaflet
* Recharts

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Socket.IO
* JWT
* bcrypt
* Zod
* Nodemailer
* node-cron

---

## 🏗️ Project Structure

```text
First_Project/
│
├── client/          # React frontend
│
├── server/          # Node.js + Express backend
│
├── .env.example
├── package.json
├── package-lock.json
└── AmiHacks_Problem_Statement-1.md
```

---

## 🔄 How It Works

```text
        👨‍🍳 Food Donor
              │
              ▼
       Post Surplus Food
              │
              ▼
      📍 Location Matching
              │
              ▼
       🏠 Recipient / NGO
              │
              ▼
       🚗 Pickup Coordination
              │
              ▼
        🍱 Food Delivered
              │
              ▼
         📊 Impact Tracked
```

The goal is to make the entire process easier to manage through a single platform.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Node.js
* npm
* MongoDB
* Git

### Clone the repository

```bash
git clone https://github.com/jaindeshna699-prog/First_Project.git

cd First_Project
```

### Install dependencies

```bash
npm install
```

Install client dependencies:

```bash
cd client
npm install
```

Install server dependencies:

```bash
cd ../server
npm install
```

### Environment Variables

Create your environment files using the provided `.env.example` file and add the required configuration such as database and authentication settings.

> ⚠️ Never commit API keys, passwords, tokens, or other secrets to GitHub.

### Run the project

From the root directory:

```bash
npm run dev
```

---

## 🎯 Project Goals

Surplus-to-Shelter aims to:

* ♻️ Reduce avoidable food waste
* 🤝 Connect food donors with NGOs and shelters
* ⚡ Make food redistribution faster
* 📍 Improve location-based coordination
* 🚗 Simplify pickup and delivery
* 📊 Track the social impact of rescued food

---

## 🔮 Future Improvements

Some features that can be added in future versions:

* 🤖 AI-powered donor-recipient matching
* 🗺️ Advanced route optimization
* 📱 Mobile application
* 🔔 Push/SMS notifications
* 📸 Food image recognition
* 📈 Advanced analytics and reporting
* 🌱 More detailed environmental impact tracking

---

## 🏆 Hackathon

This project was developed around the **AmiHacks – Surplus-to-Shelter: Real-Time Food Rescue Routing** problem statement.

The project focuses on using technology to address food waste, redistribution, and real-time coordination challenges.

---

## 👩‍💻 Author

### Deshna Jain

Computer Science Engineering Student

🔗 GitHub: [@jaindeshna699-prog](https://github.com/jaindeshna699-prog)

---

## ⭐ Support

If you find this project interesting, consider giving it a ⭐ on GitHub!

---

<p align="center">
  🍱 <b>Save Food • Connect Communities • Create Impact</b> 🌱
</p>
