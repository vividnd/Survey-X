use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // Test structs for comprehensive operation testing
    pub struct TestInput {
        value1: u64,
        value2: u8,
        value3: u16,
        flag: bool,
    }

    pub struct TestOutput {
        result: u64,
        processed: u8,
        calculated: u16,
        status: bool,
    }

    // Test constants
    const MAX_VALUE: u64 = 1000;
    const MIN_THRESHOLD: u8 = 5;
    const DEFAULT_SCORE: u16 = 100;

    #[instruction]
    pub fn test_all_operations(
        input: Enc<Shared, TestInput>,
        recipient: Shared
    ) -> (Enc<Shared, TestOutput>, Enc<Shared, u64>) {
        let data = input.to_arcis();
        
        // ========================================
        // TEST 1: Binary Expressions
        // ========================================
        
        // ✅ Addition
        let sum = data.value1 + 100u64;
        
        // ✅ Subtraction  
        let diff = data.value1 - 50u64;
        
        // ✅ Multiplication
        let product = data.value2 as u64 * 2u64;
        
        // ✅ Division
        let quotient = data.value1 / 2u64;
        
        // ✅ Modulo
        let remainder = data.value1 % 3u64;
        
        // ✅ Comparison operations
        let is_greater = data.value1 > MAX_VALUE;
        let is_less_equal = data.value1 <= MAX_VALUE;
        let is_equal = data.value1 == MAX_VALUE;
        let is_not_equal = data.value1 != MAX_VALUE;
        
        // ✅ Boolean operations
        let combined_flag = data.flag && (data.value2 > MIN_THRESHOLD);
        let either_flag = data.flag || (data.value3 > DEFAULT_SCORE);
        let xor_flag = data.flag ^ (data.value2 > MIN_THRESHOLD);
        let and_flag = data.flag & (data.value2 > MIN_THRESHOLD);
        let or_flag = data.flag | (data.value2 > MIN_THRESHOLD);
        
        // ========================================
        // TEST 2: Cast Expressions
        // ========================================
        
        // ✅ Integer to integer
        let u8_to_u64: u64 = data.value2 as u64;
        let u16_to_u64: u64 = data.value3 as u64;
        
        // ✅ Integer to boolean
        let bool_from_int: bool = (data.value2 > 0u8) as bool;
        
        // ✅ Boolean to integer
        let int_from_bool: u64 = data.flag as u64;
        
        // ========================================
        // TEST 3: Control Flow
        // ========================================
        
        // ✅ If-else statements with data independence
        let bonus_score = if data.value1 > 500u64 {
            100u64
        } else if data.value1 > 200u64 {
            50u64
        } else {
            25u64
        };
        
        let risk_level = if data.value2 >= 8u8 && data.value3 > 150u16 {
            1u8 // Low risk
        } else if data.value2 >= 6u8 && data.value3 > 100u16 {
            3u8 // Medium risk
        } else if data.value2 >= 4u8 && data.value3 > 50u16 {
            5u8 // High risk
        } else {
            7u8 // Very high risk
        };
        
        // ========================================
        // TEST 4: Field Access and Struct Operations
        // ========================================
        
        // ✅ Field access
        let val1 = data.value1;
        let val2 = data.value2;
        let val3 = data.value3;
        let flag_val = data.flag;
        
        // ✅ Struct literals
        let output = TestOutput {
            result: sum + bonus_score,
            processed: risk_level,
            calculated: data.value3,
            status: combined_flag,
        };
        
        // ========================================
        // TEST 5: Mathematical Operations
        // ========================================
        
        // ✅ Complex calculations with parentheses
        let complex_calc = (sum + diff) * (product / quotient) + remainder;
        
        // ✅ Conditional calculations
        let conditional_result = if data.flag {
            complex_calc + bonus_score
        } else {
            complex_calc - bonus_score
        };
        
        // ========================================
        // TEST 6: Array and Tuple Operations
        // ========================================
        
        // ✅ Array literals (fixed size)
        let scores = [data.value1, data.value1 + 100u64, data.value1 + 200u64];
        
        // ✅ Tuple literals
        let coordinates = (data.value2 as u64, data.value3 as u64, data.value1);
        
        // ✅ Array indexing (compile-time known)
        let first_score = scores[0];
        let second_score = scores[1];
        let third_score = scores[2];
        
        // ✅ Tuple access
        let x_coord = coordinates.0;
        let y_coord = coordinates.1;
        let z_coord = coordinates.2;
        
        // ========================================
        // TEST 7: Logical Operations
        // ========================================
        
        // ✅ Complex boolean logic
        let eligibility = (data.value1 >= 500u64) && 
                         (data.value2 >= 6u8) && 
                         (data.value3 >= 100u16) && 
                         data.flag;
        
        let warning = (data.value1 < 100u64) || 
                     (data.value2 < 3u8) || 
                     (data.value3 < 50u16) || 
                     !data.flag;
        
        // ========================================
        // TEST 8: Performance Optimizations
        // ========================================
        
        // ✅ Minimize expensive operations
        let cheap_calc = first_score + second_score + third_score; // Only additions
        
        // ✅ Group calculations
        let expensive_calc = (x_coord * y_coord * z_coord) + (sum * diff); // Group multiplications
        
        // ========================================
        // TEST 9: Data Independence Verification
        // ========================================
        
        // ✅ All code paths execute regardless of input values
        let path1 = if data.value1 > 0u64 { 1u64 } else { 0u64 };
        let path2 = if data.value2 > 0u8 { 1u64 } else { 0u64 };
        let path3 = if data.value3 > 0u16 { 1u64 } else { 0u64 };
        let path4 = if data.flag { 1u64 } else { 0u64 };
        
        // All paths are guaranteed to execute
        let total_paths = path1 + path2 + path3 + path4;
        
        // ========================================
        // TEST 10: Final Output Construction
        // ========================================
        
        // ✅ Create comprehensive output
        let final_output = TestOutput {
            result: conditional_result + total_paths,
            processed: risk_level,
            calculated: data.value3,
            status: eligibility && !warning,
        };
        
        // ✅ Create summary for recipient
        let summary = cheap_calc + expensive_calc + bonus_score;
        
        // ========================================
        // TEST 11: Encryption and Sealing
        // ========================================
        
        // ✅ Encrypt for owner (all data together)
        let owner_result = input.owner.from_arcis(final_output);
        
        // ✅ Re-encrypt summary for recipient
        let recipient_result = recipient.from_arcis(summary);
        
        // Return both encrypted results
        (owner_result, recipient_result)
    }

    // ========================================
    // TEST 12: Additional Operation Tests
    // ========================================
    
    #[instruction]
    pub fn test_advanced_operations(
        input: Enc<Shared, u64>,
        analyst: Shared
    ) -> (Enc<Shared, u64>, Enc<Shared, u8>) {
        let value = input.to_arcis();
        
        // ✅ Test bitwise operations (if supported)
        let doubled = value * 2u64;
        let halved = value / 2u64;
        
        // ✅ Test range-based logic
        let category = if value > 1000u64 {
            5u8 // Premium
        } else if value > 500u64 {
            4u8 // High
        } else if value > 200u64 {
            3u8 // Medium
        } else if value > 100u64 {
            2u8 // Basic
        } else {
            1u8 // Simple
        };
        
        // ✅ Test conditional assignments
        let adjusted_value = if category >= 4u8 {
            doubled + 100u64
        } else if category >= 2u8 {
            doubled + 50u64
        } else {
            doubled + 25u64
        };
        
        // ✅ Test boolean conversions
        let is_premium = (category >= 4u8) as bool;
        let is_basic = (category <= 2u8) as bool;
        
        // ✅ Test complex boolean logic
        let should_upgrade = is_premium && !is_basic && (adjusted_value > 1000u64);
        
        // ✅ Test mathematical combinations
        let final_score = if should_upgrade {
            adjusted_value * 2u64
        } else {
            adjusted_value
        };
        
        // ✅ Test risk assessment
        let risk_score = if final_score > 2000u64 {
            1u8 // Very low risk
        } else if final_score > 1000u64 {
            3u8 // Low risk
        } else if final_score > 500u64 {
            5u8 // Medium risk
        } else if final_score > 200u64 {
            7u8 // High risk
        } else {
            9u8 // Very high risk
        };
        
        // ✅ Encrypt results for different recipients
        let owner_result = input.owner.from_arcis(final_score);
        let analyst_result = analyst.from_arcis(risk_score);
        
        (owner_result, analyst_result)
    }
}
