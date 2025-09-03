import { Router } from 'express';
import { ArciumService } from '../services/ArciumService';

const router = Router();

// Function to get Arcium service with current environment configuration
function getArciumService(): ArciumService {
  return new ArciumService({
    apiKey: process.env.ARCIUM_API_KEY || '',
    clusterId: process.env.ARCIUM_CLUSTER_ID || '',
    callbackUrl: process.env.ARCIUM_CALLBACK_URL,
    serverPort: parseInt(process.env.ARCIUM_CALLBACK_PORT || '3002'),
    mpcNodes: parseInt(process.env.ARCIUM_MPC_NODES || '3'),
    privacyEpsilon: parseFloat(process.env.ARCIUM_PRIVACY_EPSILON || '1.0'),
    privacyDelta: parseFloat(process.env.ARCIUM_PRIVACY_DELTA || '0.0001'),
    useRpcCallbacks: process.env.ARCIUM_USE_RPC_CALLBACKS === 'true',
    rpcEndpoint: process.env.ARCIUM_RPC_ENDPOINT
  });
}

// Health check for Arcium service
router.get('/health', async (req, res) => {
  try {
    const arciumService = getArciumService();
    const nodeHealth = await arciumService.getMPCNodeHealth();
    res.json({
      status: 'OK',
      service: 'Arcium MPC',
      timestamp: new Date().toISOString(),
      mpcNodes: nodeHealth,
      callbackServer: process.env.ARCIUM_CALLBACK_PORT ? 'running' : 'not configured'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Arcium MPC integration
router.get('/test', async (req, res) => {
  try {
    // Test MPC node initialization
    const arciumService = getArciumService();
    const nodeHealth = await arciumService.getMPCNodeHealth();
    
    res.json({
      success: true,
      message: 'Arcium MPC service is working',
      timestamp: new Date().toISOString(),
      mpcNodes: nodeHealth.length,
      activeNodes: nodeHealth.filter((n: any) => n.status === 'healthy').length,
      callbackUrl: process.env.ARCIUM_CALLBACK_URL || 'Not configured'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get computation status
router.get('/computations/:computationId', async (req, res) => {
  try {
    const { computationId } = req.params;
    const arciumService = getArciumService();
    const computation = await arciumService.getComputationStatus(computationId);
    
    if (!computation) {
      return res.status(404).json({
        success: false,
        error: 'Computation not found'
      });
    }
    
    res.json({
      success: true,
      data: computation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get MPC node health status
router.get('/nodes/health', async (req, res) => {
  try {
    const arciumService = getArciumService();
    const nodeHealth = await arciumService.getMPCNodeHealth();
    
    res.json({
      success: true,
      data: {
        totalNodes: nodeHealth.length,
        healthyNodes: nodeHealth.filter((n: any) => n.status === 'healthy').length,
        unhealthyNodes: nodeHealth.filter((n: any) => n.status === 'unhealthy').length,
        nodes: nodeHealth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get privacy settings
router.get('/privacy/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      epsilon: process.env.ARCIUM_PRIVACY_EPSILON || 1.0,
      delta: process.env.ARCIUM_PRIVACY_DELTA || 0.0001,
      mpcNodes: process.env.ARCIUM_MPC_NODES || 3,
      differentialPrivacy: true,
      anonymization: true,
      pseudonymization: true
    }
  });
});

// Update privacy settings
router.post('/privacy/settings', (req, res) => {
  try {
    const { epsilon, delta, mpcNodes } = req.body;
    
    // In production, you'd want to validate and store these settings
    // For now, we'll just return the updated values
    
    res.json({
      success: true,
      message: 'Privacy settings updated',
      data: {
        epsilon: epsilon || 1.0,
        delta: delta || 0.0001,
        mpcNodes: mpcNodes || 3,
        differentialPrivacy: true,
        anonymization: true,
        pseudonymization: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get privacy budget information
router.get('/privacy/budget', async (req, res) => {
  try {
    const budget = await arciumService.getPrivacyBudget();
    
    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update privacy budget
router.post('/privacy/budget', async (req, res) => {
  try {
    const { epsilon, delta } = req.body;
    
    if (!epsilon || !delta) {
      return res.status(400).json({
        success: false,
        error: 'Epsilon and delta are required'
      });
    }
    
    const budget = await arciumService.updatePrivacyBudget(epsilon, delta);
    
    res.json({
      success: true,
      message: 'Privacy budget updated',
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate zero-knowledge proof for computation
router.post('/computations/:computationId/zk-proof', async (req, res) => {
  try {
    const { computationId } = req.params;
    const { publicInputs } = req.body;
    
    if (!publicInputs || !Array.isArray(publicInputs)) {
      return res.status(400).json({
        success: false,
        error: 'Public inputs array is required'
      });
    }
    
    const zkProof = await arciumService.generateZeroKnowledgeProof(computationId, publicInputs);
    
    res.json({
      success: true,
      data: zkProof
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify zero-knowledge proof
router.post('/zk-proof/verify', async (req, res) => {
  try {
    const { proof, publicInputs, verificationKey } = req.body;
    
    if (!proof || !publicInputs || !verificationKey) {
      return res.status(400).json({
        success: false,
        error: 'Proof, public inputs, and verification key are required'
      });
    }
    
    const isVerified = await arciumService.verifyZeroKnowledgeProof({
      proof,
      publicInputs,
      verificationKey,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: {
        verified: isVerified,
        verificationTime: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify computation with ZK proofs
router.post('/computations/:computationId/verify', async (req, res) => {
  try {
    const { computationId } = req.params;
    
    const verification = await arciumService.verifyComputation(computationId);
    
    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle RPC callbacks for large computations
router.post('/rpc/callback', async (req, res) => {
  try {
    const rpcData = req.body;
    
    if (!rpcData.computationId || !rpcData.status) {
      return res.status(400).json({
        success: false,
        error: 'Computation ID and status are required'
      });
    }
    
    await arciumService.handleRpcCallback(rpcData);
    
    res.json({
      success: true,
      message: 'RPC callback processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mock MPC node endpoints for development
router.get('/mock/node1', (req, res) => {
  res.json({
    nodeId: 'mock-node-1',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: 'http://localhost:3001/api/arcium/mock/node1'
  });
});

router.get('/mock/node2', (req, res) => {
  res.json({
    nodeId: 'mock-node-2',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: 'http://localhost:3001/api/arcium/mock/node2'
  });
});

router.get('/mock/node3', (req, res) => {
  res.json({
    nodeId: 'mock-node-3',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: 'http://localhost:3001/api/arcium/mock/node3'
  });
});

// Test MPC computation with sample data
router.post('/test/computation', async (req, res) => {
  try {
    const { testType = 'encryption' } = req.body;
    
    let computationId: string;
    
    if (testType === 'encryption') {
      // Test survey response encryption
      computationId = await arciumService.encryptSurveyResponse(
        'test-survey-123',
        'test-question-456',
        'Sample answer for testing',
        'anonymous'
      );
    } else if (testType === 'analytics') {
      // Test survey analytics
      const testResponses = [
        { questionId: 'q1', answer: 5 },
        { questionId: 'q2', answer: 'Good' },
        { questionId: 'q3', answer: 4 }
      ];
      
      computationId = await arciumService.processSurveyAnalytics(
        'test-survey-123',
        testResponses
      );
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid test type. Use "encryption" or "analytics"'
      });
    }
    
    res.json({
      success: true,
      message: `MPC ${testType} test computation submitted`,
      data: {
        computationId,
        testType,
        status: 'pending',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Wait for computation completion
router.post('/computations/:computationId/wait', async (req, res) => {
  try {
    const { computationId } = req.params;
    const { timeout = 30000 } = req.body; // Default 30 seconds
    
    const result = await arciumService.waitForComputation(computationId, timeout);
    
    res.json({
      success: true,
      message: 'Computation completed',
      data: {
        computationId,
        result,
        status: 'completed',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 