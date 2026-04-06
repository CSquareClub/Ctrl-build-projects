# [Open Source - Project 1]

## 🚀 Project Title  
OpenIssue 

## 🧠 Problem Statement  
Maintainers waste hours triaging noisy GitHub issues. Duplicate reports, vague bugs, and missing labels slow down development.

## 🎯 Objective  
Build an intelligent issue triage assistant using embeddings + heuristics.

## 👥 Target Users  
Maintainers

## ⚙️ Core Features (MVP - achievable in 24 hours)
- Issue classification
- Duplicate detection
- Priority scoring

## 🌟 Advanced Features (for top teams)
- GitHub webhook bot
- Auto-comment suggestions

## 🔄 User Flow
1. Submit issue
2. Analyze
3. Label + suggest duplicates

## 🏗️ System Design Overview
Frontend → API → NLP service → Vector DB

## 🔌 API Design
POST /analyze
GET /similar
POST /label
GET /issues

## 🗄️ Database Schema
Issue, Embedding

## ⚠️ Engineering Challenges
Similarity search tuning

## 🧪 Edge Cases
Spam issues

## 🧰 Suggested Tech Stack
Node/Python + embeddings

## 📊 Evaluation Criteria
- Innovation  
- System Design  
- Code Quality  
- Completeness  
- UX  

## 📦 Deliverables (MANDATORY)
- Source code  
- README with setup  


## ⏱️ Constraints
- 24 hours  
- Focus on MVP first  

## 💡 Bonus Ideas
Use OpenAI embeddings
