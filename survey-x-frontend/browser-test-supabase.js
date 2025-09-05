// Browser console test for Supabase connectivity
// Copy and paste this into your browser console

console.log('🔍 Testing Supabase connection...');

// Test 1: Direct fetch
fetch('https://nlfzwmlrvlegybnsmnvb.supabase.co/rest/v1/surveys?select=count', {
    headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZnp3bWxydmxlZ3libnNtbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMTUzNzMsImV4cCI6MjA3MjU5MTM3M30.aQgvv57U2nK5AqurVxdGV19h2dyoeyTd7m5HaFYRv6I',
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('✅ Direct fetch status:', response.status);
    return response.json().catch(() => ({ error: 'Invalid JSON' }));
})
.then(data => console.log('✅ Direct fetch result:', data))
.catch(error => console.log('❌ Direct fetch error:', error));

// Test 2: Supabase client test
(async () => {
    try {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
        const supabase = createClient(
            'https://nlfzwmlrvlegybnsmnvb.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZnp3bWxydmxlZ3libnNtbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMTUzNzMsImV4cCI6MjA3MjU5MTM3M30.aQgvv57U2nK5AqurVxdGV19h2dyoeyTd7m5HaFYRv6I'
        );
        
        const { data, error } = await supabase.from('surveys').select('count').limit(1);
        
        if (error) {
            console.log('❌ Supabase client error:', error);
        } else {
            console.log('✅ Supabase client works:', data);
        }
    } catch (error) {
        console.log('❌ Supabase client test failed:', error);
    }
})();
