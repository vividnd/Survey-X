// Network diagnostic script
console.log('🔍 Network Diagnostics for Supabase');

// Test 1: Basic connectivity
fetch('https://nlfzwmlrvlegybnsmnvb.supabase.co/rest/v1/', {
    method: 'GET',
    headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZnp3bWxydmxlZ3libnNtbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMTUzNzMsImV4cCI6MjA3MjU5MTM3M30.aQgvv57U2nK5AqurVxdGV19h2dyoeyTd7m5HaFYRv6I'
    }
})
.then(response => {
    console.log('✅ Basic connectivity:', response.status, response.statusText);
    return response.text();
})
.then(text => console.log('Response preview:', text.substring(0, 100)))
.catch(error => {
    console.error('❌ Basic connectivity failed:', error.message);
    
    if (error.message.includes('CORS')) {
        console.log('🔍 CORS Error: Disable browser extensions or use CORS unblocker');
    } else if (error.message.includes('NetworkError')) {
        console.log('🔍 Network Error: Check internet connection or firewall');
    } else if (error.message.includes('Failed to fetch')) {
        console.log('🔍 Fetch Error: Common with browser extensions or VPN');
    }
});

// Test 2: DNS resolution
console.log('🔍 Testing DNS resolution...');
const img = new Image();
img.onload = () => console.log('✅ DNS resolution works');
img.onerror = () => console.log('❌ DNS resolution failed');
img.src = 'https://nlfzwmlrvlegybnsmnvb.supabase.co/favicon.ico';

// Test 3: Check for conflicting extensions
console.log('🔍 Browser extensions that might interfere:');
console.log('- Ad blockers (uBlock, AdBlock Plus)');
console.log('- Privacy extensions (Privacy Badger, Ghostery)');
console.log('- VPN extensions');
console.log('- Anti-virus browser extensions');
