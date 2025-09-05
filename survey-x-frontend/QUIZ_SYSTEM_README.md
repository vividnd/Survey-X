# Quiz + Whitelist System for Survey-X

## Overview

The Quiz + Whitelist System extends your survey dApp with comprehensive quiz functionality, automatic grading, and exclusive content access through a whitelist mechanism.

## Features

### 🎯 **Quiz System**
- **Multiple Question Types**: Multiple choice and text input questions
- **Automatic Grading**: MCQ questions are automatically graded
- **Manual Grading**: Text questions can be manually graded with partial marks
- **Time Limits**: Optional time constraints for quizzes
- **Attempt Limits**: Configurable maximum attempts per user
- **Real-time Scoring**: Live score calculation and progress tracking

### 🏆 **Whitelist System**
- **Automatic Whitelisting**: Users who pass the minimum score are automatically whitelisted
- **Special Survey Access**: Whitelisted users get access to exclusive surveys
- **Score-based Access**: Configurable minimum score requirements
- **Manual Management**: Quiz creators can manually manage whitelist

### 📊 **Analytics & Management**
- **Comprehensive Analytics**: Detailed quiz performance metrics
- **Grading Interface**: Easy-to-use interface for grading text responses
- **User Management**: Track and manage quiz participants
- **Response Analytics**: Question-by-question analysis

## Database Schema

### Core Tables

#### `quizzes`
- Extends surveys with quiz-specific fields
- Stores minimum score, time limits, attempt limits
- Links to base survey for questions

#### `quiz_questions`
- Links survey questions to quiz-specific data
- Stores correct answers, points, explanations
- Enables automatic grading for MCQ questions

#### `quiz_attempts`
- Tracks user attempts and scores
- Stores completion status and timing
- Links to whitelist entries

#### `quiz_responses`
- Individual question responses
- Stores grading status and feedback
- Supports both auto and manual grading

#### `whitelist`
- Tracks whitelisted wallet addresses
- Links to quiz attempts and scores
- Supports expiration dates

#### `special_surveys`
- Exclusive surveys for whitelisted users
- Links to parent quiz for access control
- Separate from regular surveys

## API Endpoints

### Quiz Management
```typescript
// Create a new quiz
QuizService.createQuiz(quizData)

// Get quiz details
QuizService.getQuiz(quizId)

// Get quiz questions
QuizService.getQuizQuestions(quizId)
```

### Quiz Attempts
```typescript
// Create quiz attempt
QuizService.createQuizAttempt(attemptData)

// Submit quiz response
QuizService.submitQuizResponse(responseData)

// Submit quiz attempt
QuizService.submitQuizAttempt(attemptId)
```

### Grading
```typescript
// Auto-grade MCQ response
QuizService.autoGradeMCQResponse(questionId, responseData)

// Manually grade text response
QuizService.gradeTextResponse(responseId, points, feedback)
```

### Whitelist Management
```typescript
// Check whitelist status
QuizService.getWhitelistStatus(walletAddress, quizId)

// Get whitelisted users
QuizService.getWhitelistedUsers(quizId)

// Add/remove from whitelist
QuizService.addToWhitelist(whitelistData)
QuizService.removeFromWhitelist(walletAddress, quizId)
```

## Frontend Components

### Core Components

#### `QuizInterface`
- Main quiz taking interface
- Mobile-optimized with progress tracking
- Real-time validation and navigation
- Timer support for time-limited quizzes

#### `QuizResults`
- Displays quiz results and scores
- Shows question-by-question breakdown
- Whitelist status indication
- Retake functionality

#### `QuizCreator`
- Comprehensive quiz creation interface
- Question builder with multiple types
- Settings for scoring and limits
- Preview functionality

#### `QuizGradingInterface`
- Grading dashboard for quiz creators
- Manual grading for text questions
- Analytics and user management
- Whitelist management tools

#### `SpecialSurveyAccess`
- Access control for special surveys
- Whitelist status display
- Survey listing and access

## Usage Guide

### Creating a Quiz

1. **Navigate to Quiz Creation**
   ```
   /quiz/create
   ```

2. **Configure Quiz Settings**
   - Set title and description
   - Configure minimum passing score
   - Set time limits (optional)
   - Configure attempt limits

3. **Add Questions**
   - Multiple choice questions with correct answers
   - Text input questions for manual grading
   - Set points for each question
   - Add explanations (optional)

4. **Publish Quiz**
   - Quiz is automatically created and activated
   - Share quiz link with participants

### Taking a Quiz

1. **Access Quiz**
   ```
   /quiz/{quizId}
   ```

2. **Quiz Interface**
   - Answer questions one by one
   - Progress tracking and navigation
   - Timer display (if enabled)
   - Auto-save functionality

3. **Submit and Results**
   - Automatic grading for MCQ questions
   - Manual grading for text questions
   - Score calculation and whitelist status
   - Access to special surveys (if qualified)

### Managing Quizzes

1. **Access Management Dashboard**
   ```
   /quiz/{quizId}/manage
   ```

2. **Grading Interface**
   - Review ungraded text responses
   - Award points and provide feedback
   - Monitor quiz analytics

3. **Whitelist Management**
   - View whitelisted users
   - Manual whitelist management
   - Create special surveys

### Special Surveys

1. **Create Special Survey**
   ```
   /quiz/{quizId}/special-surveys
   ```

2. **Access Control**
   - Only whitelisted users can access
   - Automatic access verification
   - Exclusive content delivery

## Security Features

### Row Level Security (RLS)
- All tables have RLS policies
- Users can only access their own data
- Quiz creators can manage their quizzes
- Whitelist access is properly controlled

### Data Encryption
- Quiz responses are encrypted using Arcium MPC
- Wallet addresses are protected
- Sensitive data is properly secured

### Access Control
- Whitelist-based access to special surveys
- Quiz attempt limits prevent abuse
- Time limits prevent extended access

## Mobile Optimization

### Responsive Design
- Mobile-first approach
- Touch-optimized interactions
- Adaptive layouts for all screen sizes
- Progressive web app features

### Performance
- Lazy loading of quiz data
- Optimized database queries
- Efficient state management
- Fast navigation between questions

## Analytics & Insights

### Quiz Analytics
- Total attempts and completion rates
- Average scores and time taken
- Pass/fail ratios
- Question-level performance

### User Analytics
- Whitelist conversion rates
- Special survey engagement
- User behavior patterns
- Performance trends

## Integration with Existing System

### Survey System Integration
- Quizzes extend the existing survey system
- Shared database and authentication
- Consistent UI/UX patterns
- Unified wallet integration

### Arcium MPC Integration
- Encrypted response storage
- Privacy-preserving analytics
- Secure data transmission
- Blockchain integration

## Deployment

### Database Setup
1. Run the quiz schema SQL file
2. Set up RLS policies
3. Configure database functions
4. Test database triggers

### Frontend Deployment
1. Install dependencies
2. Configure environment variables
3. Build and deploy
4. Test all functionality

### Backend Integration
1. Update Arcium MPC configuration
2. Test wallet integration
3. Verify encryption/decryption
4. Monitor performance

## Future Enhancements

### Planned Features
- **Advanced Question Types**: Image questions, file uploads
- **Collaborative Grading**: Multiple graders for text questions
- **Advanced Analytics**: Detailed reporting and insights
- **Gamification**: Badges, leaderboards, achievements
- **Integration**: LMS integration, API endpoints
- **Accessibility**: Screen reader support, keyboard navigation

### Scalability
- Database optimization for large datasets
- Caching strategies for improved performance
- CDN integration for global access
- Load balancing for high traffic

## Support

For questions or issues with the quiz system:
1. Check the database schema setup
2. Verify RLS policies are active
3. Test wallet connectivity
4. Review error logs and console output

The quiz system is fully integrated with your existing survey dApp and provides a comprehensive solution for interactive assessments with whitelist-based access control.
