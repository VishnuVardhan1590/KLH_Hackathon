# ✈️ Premium Guest Face Recognition Entry System

A real-time face recognition system for secure and seamless airport lounge access.

## 🚀 Overview
The system captures live video, detects faces using face-api.js, generates facial descriptors, and compares them with stored embeddings in Supabase. If a match is found, access is granted and logged.

## 🛠 Tech Stack
- React (Vite + TypeScript)
- face-api.js
- Supabase (PostgreSQL + Auth)
- Tailwind CSS / shadcn UI

## 🔐 Features
- Real-time face detection
- Secure descriptor storage (no raw images)
- Distance-based matching
- Access logging system

## ▶️ Run Locally
```bash
npm install
npm run dev
```

## 👨‍💻 Author
Vishnu Vardhan
