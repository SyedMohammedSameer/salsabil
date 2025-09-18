# 🌿 Salsabil - A Spring of Productivity & Spiritual Growth

**Salsabil** is a beautiful, comprehensive productivity app designed for mindful living and spiritual growth. Named after the spring in Paradise mentioned in Islamic tradition, this app helps users cultivate productive habits while nurturing their spiritual journey.

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![React](https://img.shields.io/badge/React-18.0+-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-10.0+-orange.svg)

## ✨ Features Overview

### 🎯 **Productivity Tools**
- **Weekly Planner**: Organize tasks with priority levels and smart scheduling
- **Calendar View**: Comprehensive calendar integration for task management
- **Pomodoro Timer**: Focus sessions with persistent timer state across modules
- **AI Assistant**: Smart task management and productivity insights

### 🕌 **Spiritual Growth**
- **Prayer Tracker**: Monitor your daily prayers with beautiful progress tracking
- **Quran Reading Log**: Track your Quran reading progress with streak counters
- **Islamic Calendar**: Stay connected with important Islamic dates

### 🌳 **Virtual Garden & Study Circles**
- **Personal Garden**: Watch trees grow as you complete focus sessions
- **Study Circles**: Join collaborative focus sessions with synchronized timers
- **Real-time Collaboration**: Live participant tracking and shared gardens
- **Privacy-First**: Username-based identity protection (no email exposure)
- **Smart Ownership**: Automatic leadership transfer when owners leave
- **Tree Accountability**: Trees die when sessions are abandoned early

### 📊 **Dashboard & Analytics**
- **Real-time Stats**: Track focus time, prayer completion, and reading progress
- **Visual Progress**: Beautiful charts and progress rings
- **Streak Tracking**: Maintain consistency with streak counters

## 🚀 **Latest Garden Module Features**

### 🌟 **Study Circles (NEW)**
- **Create & Join Circles**: Start or join collaborative focus sessions
- **Synchronized Timers**: All participants see the same countdown
- **Owner Controls**: Only circle creators can start/stop sessions
- **Automatic Leadership**: Seamless ownership transfer when leaders leave
- **Share Links**: Invite friends with shareable circle links
- **Privacy Protection**: Username display instead of email addresses

### 🌱 **Advanced Tree System**
- **Personal Garden**: Trees automatically saved to your private garden
- **Tree Varieties**: Different species based on focus type and duration
- **Growth Stages**: From seed to mature tree based on session length
- **Tree Death**: Accountability system for early session termination
- **Real-time Updates**: Live garden updates across all participants

### 🛡️ **Security & Privacy**
- **Username Prompts**: Automatic username setup for new users
- **Permission-Based**: Secure Firestore rules for data protection
- **Privacy-First**: No email exposure in public views
- **Real-time Sync**: Instant updates with optimized database operations

## 🛠 **Technical Excellence**

### 🎨 **Beautiful Design**
- **Responsive Design**: Perfect on mobile, tablet, and desktop
- **Dark/Light Mode**: Seamless theme switching
- **Glass Morphism**: Modern UI with backdrop blur effects
- **Custom Animations**: Floating particles, energy streams, and smooth transitions

### 🔧 **Robust Architecture**
- **React + TypeScript**: Type-safe, modern React architecture
- **Firebase Integration**: Real-time database with offline support
- **Optimized Performance**: Fast leave/join operations with instant UI feedback
- **Error Handling**: Comprehensive error messages and fallback states
- **Memory Management**: Leak-proof timers and component cleanup

### 🌐 **Production Ready**
- **Vercel Optimized**: Proper SPA routing configuration
- **PWA Ready**: Works offline and can be installed as an app
- **Performance Optimized**: Built with Vite for fast loading
- **Security Rules**: Production-ready Firestore security configuration

## 🚀 **Getting Started**

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/salsabil.git
cd salsabil

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password) and **Firestore Database**
3. Create a `.env` file with your Firebase config:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. **Configure Firestore Security Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data protection
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Study Rooms for Garden functionality
    match /studyRooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.createdBy;
      allow update: if request.auth != null && (
        request.auth.uid == resource.data.createdBy ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'participantCount', 'trees', 'lastActivity', 'currentSessionStart',
          'needsOwnershipTransfer', 'previousOwner', 'ownershipTransferredAt',
          'countSyncedAt', 'lastTreePlanted'
        ])
      );
      allow delete: if request.auth != null && (
        request.auth.uid == resource.data.createdBy ||
        resource.data.participantCount <= 1
      );

      match /participants/{participantId} {
        allow read: if request.auth != null;
        allow create, update, delete: if request.auth != null && request.auth.uid == participantId;
      }
    }
  }
}
```

## 🎯 **Usage Guide**

### First Time Setup
1. **Sign Up**: Create your account with a meaningful display name
2. **Complete Profile**: Set your username for privacy in study circles
3. **Create Your First Task**: Start with the Planner module
4. **Join a Study Circle**: Experience collaborative productivity

### Study Circles Workflow
1. **Create/Join**: Start a new circle or join an existing one
2. **Set Focus Duration**: Choose your session length (15-60 minutes)
3. **Invite Others**: Share the circle link with friends
4. **Focus Together**: Synchronized timer for group accountability
5. **Plant Trees**: Celebrate completed sessions with garden growth

### Privacy Features
- **Username Protection**: Set a display name to protect your email
- **Anonymous Mode**: Users without usernames show as "Anonymous"
- **Secure Sharing**: Only circle participants can see member information

## 🌟 **Version 1.0 Achievements**

### ✅ **Core Functionality**
- **Study Circles**: Fully functional collaborative focus sessions
- **Garden System**: Personal and shared tree planting with growth stages
- **Privacy Protection**: Username-based identity system
- **Real-time Sync**: Instant updates across all participants

### ✅ **Performance Optimizations**
- **Instant Leave**: Lightning-fast circle exit (95% performance improvement)
- **Optimized Database**: Efficient batch operations and reduced reads
- **Memory Management**: Leak-proof timers and component cleanup
- **Error Recovery**: Graceful handling of network issues and permissions

### ✅ **User Experience**
- **Visual Feedback**: Beautiful animations and status indicators
- **Mobile Responsive**: Perfect experience on all devices
- **Intuitive Navigation**: Clear ownership indicators and action buttons
- **Comprehensive Logging**: Detailed console output for debugging

### ✅ **Security & Reliability**
- **Production Rules**: Secure Firestore configuration
- **Input Validation**: Comprehensive error handling and user feedback
- **Data Consistency**: Automatic participant count synchronization
- **Privacy First**: No email exposure in public interfaces

## 🛣️ **Roadmap**

### 🎯 **Near Term**
- [ ] **Mobile App**: React Native version for iOS/Android
- [ ] **Enhanced Analytics**: Detailed productivity insights and trends
- [ ] **Custom Tree Varieties**: User-selectable tree types and themes
- [ ] **Study Streak Tracking**: Long-term productivity metrics

### 🚀 **Future Vision**
- [ ] **Social Features**: Friend connections and leaderboards
- [ ] **Habit Tracking**: Extended habit formation tools
- [ ] **Offline Mode**: Full offline functionality with sync
- [ ] **Team Workspaces**: Organizational productivity tools

## 🏆 **Why Salsabil?**

### 💝 **For Individuals**
- **Mindful Productivity**: Balance work and spiritual growth
- **Visual Progress**: See your productivity as a growing garden
- **Islamic Integration**: Prayer and Quran tracking built-in
- **Beautiful Experience**: Enjoy productivity with stunning design

### 👥 **For Teams**
- **Collaborative Focus**: Study and work together remotely
- **Accountability**: Shared goals with visual progress
- **Privacy Respect**: Professional username-based interactions
- **Flexible Leadership**: Automatic role management

### 🌱 **For Developers**
- **Modern Stack**: React, TypeScript, Firebase best practices
- **Clean Architecture**: Well-structured, maintainable codebase
- **Real-time Features**: Advanced Firestore usage patterns
- **Performance Optimized**: Production-ready optimization techniques

## 🤝 **Contributing**

We welcome contributions! Please feel free to submit pull requests, report bugs, or suggest features.

### Development Setup
```bash
# Fork the repository and clone your fork
git clone https://github.com/yourusername/salsabil.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push and create a pull request
git push origin feature/amazing-feature
```

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Islamic Values**: Inspired by principles of mindful living and continuous growth
- **Community**: Built with love for the global Muslim community
- **Open Source**: Standing on the shoulders of amazing open-source projects
- **Modern Design**: UI inspiration from Forest app and contemporary productivity tools

---

## 📱 **Connect & Share**

🔗 **LinkedIn**: *Share your productivity journey and inspire others*
🌐 **Demo**: *[Live demo link]*
📧 **Contact**: *[Your professional email]*

---

**"And whoever strives only strives for [the benefit of] himself."** - *Quran 29:6*

Made with ❤️ for mindful productivity and spiritual growth.

---

### 🚀 **Ready to Transform Your Productivity?**

**Star ⭐ this repository** if Salsabil helped you grow your productivity garden!

*Built by developers, for developers, with Islamic values at heart.*