// this file is part AI
// im not so good with oauth

const CLIENT_ID = '119dd61812e3d0a0c5c36112de508783';
const REDIRECT_URI = window.location.origin + window.location.pathname;

const BACKEND_URL = 'https://sigmaos.datadecay.hackclub.app'; 

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

document.addEventListener('DOMContentLoaded', async () => {
    const authButton = document.getElementById('auth-button');
    const noLoginButton = document.getElementById('no-login');
    const params = new URLSearchParams(window.location.search);

    if (params.has('code') && params.has('state')) {
        try {
            const codeVerifier = localStorage.getItem('pkce_verifier') || sessionStorage.getItem('pkce_verifier');
            if (!codeVerifier) throw new Error("Can't validate.");
            
            const response = await fetch(`${BACKEND_URL}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: params.get('code'),
                    code_verifier: codeVerifier,
                    redirect_uri: REDIRECT_URI
                })
            });

            const data = await response.json();

            
            localStorage.setItem('user_session', JSON.stringify({ 
                token: data.token, 
                user: data.user 
            }));
            
            localStorage.setItem('os_state', JSON.stringify(data.data || {}));

            localStorage.removeItem('pkce_verifier');
            sessionStorage.removeItem('pkce_verifier');
            window.location.href = './index.html';
            return;

        } catch (err) {
            console.error('OAuth failure:', err.message);
            alert('Auth failed');
        }
    }

    if (authButton) {
        authButton.addEventListener('click', async () => {
            const verifier = generateRandomString(64);
            const challenge = await generateCodeChallenge(verifier);
            const state = generateRandomString(16);

            localStorage.setItem('pkce_verifier', verifier);
            sessionStorage.setItem('pkce_verifier', verifier);

            const authUrl = new URL('https://auth.hackclub.com/oauth/authorize');
            authUrl.searchParams.set('client_id', CLIENT_ID);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('scope', 'profile name verification_status');
            authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
            authUrl.searchParams.set('code_challenge', challenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');
            authUrl.searchParams.set('state', state);

            window.location.href = authUrl.toString();
        });
    }

    if (noLoginButton) {
        noLoginButton.addEventListener('click', () => {
            window.localStorage.setItem('nolog', 'nolog');
            window.location.href = './index.html';
        });
    }
});