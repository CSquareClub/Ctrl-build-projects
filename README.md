# SAIVO - AI Chatbot Application

SAIVO is a modern, full-stack AI chatbot application built with FastAPI (Python) backend and vanilla JavaScript frontend. It features real-time streaming responses, chat management, user authentication, and a clean dark-themed UI.

## 🚀 Features

### Core Features
- **AI-Powered Chat**: Real-time streaming responses using Groq AI (LLaMA 3.3 70B model)
- **Chat Management**: Create, rename, and delete chat conversations
- **Auto-Generated Titles**: Smart title generation for new chats based on conversation context
- **Message History**: Persistent storage of all conversations in MongoDB

### User Authentication
- **Secure Login/Signup**: Password hashing with bcrypt
- **Session Management**: Persistent login sessions with localStorage
- **Password Reset**: Email-based password reset functionality

### Account Management
- **Account Deletion**: 30-day grace period soft-delete system
- **Deletion Rate Limiting**: Users can only request deletion once per week
- **Cancellation Option**: Cancel scheduled deletion by logging in

### Help & Support
- **Help Request System**: Submit issues/problems directly from the app
- **Submission History**: View history of submitted help requests
- **Status Tracking**: Track if issues are being worked on or fixed

### UI/UX
- **Dark Theme**: Modern dark-themed interface
- **Responsive Design**: Works on desktop and mobile devices
- **Smooth Animations**: CSS transitions and animations throughout
- **Tab-Based Navigation**: Clean tabbed interface for modals

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Motor**: Async MongoDB driver
- **Pydantic**: Data validation using Python type hints
- **Passlib**: Password hashing (bcrypt)
- **HTTPX**: Async HTTP client for AI API calls
- **Uvicorn**: ASGI server

### Frontend
- **HTML5/CSS3**: Semantic markup with modern CSS
- **Vanilla JavaScript**: No framework dependencies
- **Fetch API**: For API communication
- **CSS Variables**: Theming and consistent styling

### Database
- **MongoDB**: NoSQL document database
- **Collections**: users, chats, messages, help_requests

### AI Integration
- **Groq API**: Fast AI inference
- **LLaMA 3.3 70B**: Large language model for chat responses
- **LLaMA 3.1 8B**: Smaller model for title generation

## 📁 Project Structure

See [STRUCTURE.md](STRUCTURE.md) for detailed folder structure.

## 🚦 Getting Started

### Prerequisites
- Python 3.10+
- MongoDB (local or Atlas)
- Groq API Key

### Backend Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Environment Variables
Create a `.env` file in the backend folder:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=saivo
GROQ_API_KEY=your_groq_api_key
GROQ_API_KEY_TITLE=your_groq_api_key_for_titles
```

### Run the Server
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Access the App
Open `frontend/index.html` in your browser or serve it with a local server.

## 📝 API Endpoints

### Authentication
- `POST /auth/signup` - Create new user
- `POST /auth/login` - User login
- `POST /password-reset/request` - Request password reset
- `POST /password-reset/verify` - Verify reset code
- `POST /password-reset/reset` - Reset password

### Chats
- `GET /chats/{user_id}` - Get all chats for user
- `POST /chats` - Create new chat
- `DELETE /chats/{chat_id}` - Delete chat
- `PATCH /chats/{chat_id}/rename` - Rename chat

### Messages
- `GET /messages/{chat_id}` - Get messages for chat
- `POST /messages` - Send message (streaming response)

### Account
- `GET /account/info/{user_id}` - Get account info
- `POST /account/delete-request` - Request account deletion
- `POST /account/cancel-deletion` - Cancel scheduled deletion

### Help
- `POST /help/submit` - Submit help request
- `GET /help/status/{user_id}` - Get user's help requests

## 🤖 AI Assistance Disclosure

This project was developed with the assistance of AI tools for coding implementation. However:

- **All logic and architecture decisions are original** - The overall system design, feature decisions, and problem-solving approaches are mine
- **AI was used for coding acceleration** - Writing boilerplate, implementing features based on my specifications
- **Debugging was done together** - Learning from errors, understanding what's happening in the code
- **Code review and understanding** - All AI-generated code was reviewed, understood, and modified as needed

The AI served as a coding assistant, similar to having a knowledgeable pair programmer, while the creative direction and logical decisions remained mine.

## 📄 License

This project is for personal/educational use.

## 👤 Author

Built with ❤️ and AI assistance
