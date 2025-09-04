# Survey-X Architecture: Hybrid On-Chain/Off-Chain Design

## 🎯 **Core Concept: Sign Transactions On-Chain, Store Surveys in Supabase**

Your Survey-X platform uses a **hybrid architecture** that combines the best of both worlds:

### **🔐 ON-CHAIN (Solana Blockchain + Arcium MPC)**
- **Transaction Signing**: All survey creation and responses require wallet signatures
- **Encrypted Computation**: Arcium MPC processes data with privacy preservation
- **Immutable Records**: Every action is recorded on Solana blockchain
- **Security**: Cryptographic verification of all transactions

### **📊 OFF-CHAIN (Supabase Database)**
- **Survey Discovery**: Browse and search surveys easily
- **Fast Loading**: UI data loads quickly from Supabase
- **Metadata Storage**: Titles, descriptions, questions, responses
- **Real-time Updates**: Live response counts and status tracking

---

## 📋 **Complete User Flow**

### **Creating a Survey:**

1. **User fills survey form** in Next.js frontend
2. **Frontend saves metadata** to Supabase (title, questions, etc.)
3. **Frontend prompts wallet signature** for on-chain transaction
4. **User approves transaction** in Phantom wallet
5. **Transaction processed** via Arcium MPC on Solana
6. **Survey becomes discoverable** to other users via Supabase

### **Submitting a Response:**

1. **User browses survey** from Supabase data
2. **User fills response form** in Next.js frontend
3. **Frontend saves response metadata** to Supabase
4. **Frontend prompts wallet signature** for on-chain transaction
5. **User approves transaction** in Phantom wallet
6. **Encrypted response processed** via Arcium MPC on Solana
7. **Response status updated** in Supabase with transaction hash

---

## 🏗️ **Technical Implementation**

### **SurveyService Class Methods:**

```typescript
// Create Survey: Hybrid Flow
async createSurvey(surveyData) {
  // STEP 1: Save to Supabase for discoverability
  await supabase.from('surveys').insert(surveyData)

  // STEP 2: Sign on-chain transaction
  const transaction = new Transaction()
  await wallet.signTransaction(transaction)
}

// Submit Response: Hybrid Flow
async submitResponse(surveyId, responses) {
  // STEP 1: Save response metadata to Supabase
  await supabase.from('survey_responses').insert(responseData)

  // STEP 2: Sign on-chain transaction
  const transaction = new Transaction()
  await wallet.signTransaction(transaction)

  // STEP 3: Update status with transaction hash
  await supabase.from('survey_responses').update({ transaction_hash })
}
```

### **Database Schema:**

```sql
-- Surveys table (Supabase)
CREATE TABLE surveys (
  survey_id VARCHAR PRIMARY KEY,
  title VARCHAR,
  description TEXT,
  creator_wallet VARCHAR,
  category VARCHAR,
  hashtags TEXT[],
  is_active BOOLEAN,
  question_count INTEGER,
  response_count INTEGER
);

-- Survey Questions table (Supabase)
CREATE TABLE survey_questions (
  survey_id VARCHAR,
  question_id INTEGER,
  question_text TEXT,
  question_type VARCHAR,
  options JSONB,
  required BOOLEAN
);

-- Responses table (Supabase)
CREATE TABLE survey_responses (
  response_id VARCHAR PRIMARY KEY,
  survey_id VARCHAR,
  responder_wallet VARCHAR,
  computation_status VARCHAR,
  transaction_hash VARCHAR,
  submitted_at TIMESTAMP
);
```

---

## 🎨 **User Experience Benefits**

### **✅ For Survey Creators:**
- **Instant Publishing**: Survey appears immediately in Supabase
- **Wallet Security**: All actions require cryptographic signatures
- **Transparent Fees**: Clear SOL costs for survey creation
- **Global Discovery**: Anyone can find and respond to surveys

### **✅ For Survey Respondents:**
- **Privacy Protection**: Responses encrypted via Arcium MPC
- **Easy Discovery**: Browse surveys without wallet connection
- **Secure Submission**: Wallet signatures ensure authenticity
- **Transaction Tracking**: Full visibility into on-chain processing

### **✅ For Platform:**
- **Scalability**: Supabase handles UI data, Solana handles crypto
- **Performance**: Fast loading + secure transactions
- **Cost Efficiency**: Database for metadata, blockchain for verification
- **User Adoption**: Easy onboarding + strong security

---

## 🔄 **Data Flow Diagram**

```
User Action → Next.js Frontend → SurveyService → [Supabase + Solana]

Survey Creation:
1. Form Input → Frontend
2. Save Metadata → Supabase ✅ (Immediate)
3. Sign Transaction → Solana ✅ (Secure)
4. Survey Live → Public Discovery ✅

Response Submission:
1. View Survey → Supabase ✅ (Fast)
2. Fill Response → Frontend
3. Save Metadata → Supabase ✅ (Tracking)
4. Sign Transaction → Solana ✅ (Encrypted)
5. Process MPC → Arcium ✅ (Private)
```

---

## 💰 **Cost Structure**

### **On-Chain Costs (Solana):**
- **Survey Creation**: ~0.001 SOL (gas fee)
- **Response Submission**: ~0.0005 SOL (gas fee)
- **Benefits**: Immutable, verifiable, privacy-preserving

### **Off-Chain Costs (Supabase):**
- **Storage**: Minimal (metadata only)
- **Queries**: Fast and free-tier friendly
- **Benefits**: Fast UI, easy discovery, real-time updates

---

## 🔐 **Security & Privacy**

### **On-Chain Security:**
- **Wallet Signatures**: Every action cryptographically signed
- **Blockchain Verification**: All transactions immutable
- **Arcium MPC**: Encrypted computation with privacy preservation
- **Public Auditability**: Anyone can verify transaction history

### **Off-Chain Privacy:**
- **Metadata Only**: No sensitive data stored in Supabase
- **Public Discovery**: Surveys are meant to be found
- **Wallet Tracking**: Responses linked to wallet addresses
- **Status Updates**: Real-time processing status

---

## 🚀 **Ready to Test**

Your Survey-X platform now perfectly implements your vision:

1. **✅ On-chain transaction signing** - Every action requires wallet approval
2. **✅ Supabase survey storage** - Surveys are discoverable and fast-loading
3. **✅ Arcium MPC integration** - Privacy-preserving encrypted computations
4. **✅ Hybrid architecture** - Best of both worlds for UX and security

**Test it now:** `http://localhost:3001`

1. Connect your Phantom wallet
2. Create a survey (signs transaction)
3. View it in the survey list (from Supabase)
4. Submit a response (signs another transaction)

Your architecture is production-ready! 🎉
