// Simple test script for the task tracking API
// Run after starting the mindcraft server with a bot

const BASE_URL = 'http://localhost:8080';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTaskTracking() {
    console.log('Testing task tracking API...\n');

    // Test 1: Send a message
    console.log('1. Sending message to agent...');
    const postRes = await fetch(`${BASE_URL}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'andy', message: 'what is in your inventory?' })
    });

    if (!postRes.ok) {
        console.error('POST failed:', await postRes.text());
        return;
    }

    const postData = await postRes.json();
    console.log('Response:', postData);

    if (!postData.task_id) {
        console.error('No task_id in response!');
        return;
    }

    const taskId = postData.task_id;
    console.log(`Task ID: ${taskId}\n`);

    // Test 2: Poll for completion
    console.log('2. Polling for task completion...');
    let attempt = 0;
    while (attempt < 20) {
        await sleep(1000);
        attempt++;

        const getRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
        if (!getRes.ok) {
            console.error(`GET failed (attempt ${attempt}):`, await getRes.text());
            continue;
        }

        const taskData = await getRes.json();
        console.log(`Attempt ${attempt}: status=${taskData.status}, reason=${taskData.reason}, history_len=${taskData.chat_history.length}`);

        if (taskData.status !== 'running') {
            console.log('\nTask completed!');
            console.log('Final status:', taskData.status);
            console.log('Reason:', taskData.reason);
            console.log('Chat history:', JSON.stringify(taskData.chat_history, null, 2));
            return;
        }
    }

    console.log('\nTask did not complete within 20 seconds.');
}

testTaskTracking().catch(console.error);
