import { pageVisibility, sanitizeUsername, sanitizeRoomCode, setTextContent } from './utils/index.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fetchJSON = async (url, options) => {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            console.warn('fetchJSON non-ok response', url, res.status);
            return [];
        }
        try {
            return await res.json();
        } catch (e) {
            console.warn('fetchJSON invalid JSON', url, e);
            return [];
        }
    } catch (e) {
        console.error('fetchJSON error fetching', url, e);
        return [];
    }
};
const local = {
    get: (key) => localStorage.getItem(key),
    set: (key, val) => localStorage.setItem(key, val),
    clearGame: () => ['currentRound', 'currentRoundId', 'totalRounds', 'currentPartyId', 'myUserId'].forEach(k => localStorage.removeItem(k)),
    clearAll: () => ['roomCode', 'roomId', 'token'].forEach(k => localStorage.removeItem(k))
};

async function assegurarMyUserId() {
    let myId = parseInt(local.get('myUserId'), 10);
    if (!myId || Number.isNaN(myId)) {
        const token = local.get('token');
        if (token) {
            const users = await fetchJSON(`${API_URL}/users?token=eq.${token}`);
            if (users[0]) {
                myId = users[0].id;
                local.set('myUserId', myId);
            }
        }
    }
    return myId;
}

async function abandonarSala() {
    const roomId = local.get('roomId');
    try {
        const users = await fetchJSON(`${API_URL}/users?room_id=eq.${roomId}`);
        const me = users.find(u => u.token === local.get('token'));

        if (me) {
            if (users.length === 1) {
                await fetch(`${API_URL}/users?id=eq.${me.id}`, { method: 'DELETE' });
                await fetch(`${API_URL}/parties?room_id=eq.${roomId}`, { method: 'DELETE' });
                await fetch(`${API_URL}/rooms?id=eq.${roomId}`, { method: 'DELETE' });
            } else {
                if (me.is_host) {
                    const nextHost = users.find(u => u.id !== me.id);
                    if (nextHost) await fetch(`${API_URL}/users?id=eq.${nextHost.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_host: true }) });
                }
                await fetch(`${API_URL}/users?id=eq.${me.id}`, { method: 'DELETE' });
            }
        }
    } catch (e) { console.error("Error abandonant:", e); }
    local.clearAll();
    window.location.replace('/createOrJoinRoom/');
}

const path = window.location.pathname;

async function startGame() {
    local.clearGame();
    const roomId = local.get('roomId');
    const party = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}&order=id.desc&limit=1`);

    if (party.length === 0) return alert('Error: No party found');

    const currentPartyId = party[0].id;

    const res = await fetchJSON(`${API_URL}/rpc/ensure_round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_party_id: currentPartyId, p_round_number: 1 })
    });

    if (res) {
        console.log('Game started, round 1 created');
    }
}

if (path === '/' || path === '/index.html') {
    document.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = sanitizeUsername(document.querySelector('#username').value);
        if (!username) {
            return alert('Introdueix un nom d\'usuari vàlid.');
        }
        local.set('username', username);
        window.location.replace('/createOrJoinRoom/');
    });
}

if (path.includes('/createOrJoinRoom')) {
    document.querySelector('#welcome').textContent = `Hola, ${local.get('username')}! Escull una sala per continuar.`;
    document.querySelector('#create-room-btn').addEventListener('click', () => window.location.replace('/configureRoom/'));
    document.querySelector('#show-join-btn').addEventListener('click', () => document.querySelector('#join-section').classList.toggle('hidden'));

    document.querySelector('#join-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomCode = sanitizeRoomCode(document.querySelector('#room-code').value);
        if (!roomCode) return alert('Introdueix un codi de sala vàlid.');
        const rooms = await fetchJSON(`${API_URL}/rooms?code=eq.${roomCode}`);

        if (rooms.length === 0) return alert('Aquest codi de sala no existeix.');
        const roomId = rooms[0].id;

        const users = await fetchJSON(`${API_URL}/users?room_id=eq.${roomId}`);
        const party = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}`);

        if (party.length > 0 && users.length >= party[0].max_players) return alert('La sala està plena.');
        if (users.some(u => u.username.toLowerCase() === local.get('username').toLowerCase())) return alert('Nom d\'usuari ja agafat.');

        const token = Math.random().toString(36).substring(2);
        await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: local.get('username'), token, is_host: false, room_id: roomId })
        });

        local.clearGame();
        local.set('roomCode', roomCode);
        local.set('roomId', roomId);
        local.set('token', token);
        window.location.replace(`/room/?code=${roomCode}`);
    });
}

if (path.includes('/configureRoom')) {
    document.querySelector('#config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        await fetch(`${API_URL}/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: roomCode }) });
        const rooms = await fetchJSON(`${API_URL}/rooms?code=eq.${roomCode}`);
        const roomId = rooms[0].id;

        await fetch(`${API_URL}/parties`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                num_rounds: parseInt(document.querySelector('#num-rounds').value),
                max_players: parseInt(document.querySelector('#max-players').value),
                round_time: parseInt(document.querySelector('#round-time').value),
                room_id: roomId,
                modality_id: parseInt(document.querySelector('#modality').value)
            })
        });

        const token = Math.random().toString(36).substring(2);
        await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: local.get('username'), token, is_host: true, room_id: roomId })
        });

        local.clearGame();
        local.set('roomCode', roomCode);
        local.set('roomId', roomId);
        local.set('token', token);
        window.location.replace(`/room/?code=${roomCode}`);
    });
}

if (path.includes('/room')) {
    const roomCode = local.get('roomCode');
    document.querySelector('#coderoom').textContent = roomCode;
    document.querySelector('#copycoderoom').addEventListener('click', () => navigator.clipboard.writeText(roomCode));

    const leaveBtn = document.querySelector('#leave-room-btn');
    if (leaveBtn) leaveBtn.addEventListener('click', abandonarSala);

    async function updatePlayerCount() {
        const rooms = await fetchJSON(`${API_URL}/rooms?code=eq.${roomCode}`);
        if (rooms.length === 0) {
            alert('Aquesta sala ha estat eliminada.');
            local.clearAll();
            window.location.replace('/createOrJoinRoom/');
            return;
        }

        const roomId = rooms[0].id;
        const users = await fetchJSON(`${API_URL}/users?room_id=eq.${roomId}`);
        const party = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}`);

        if (party.length > 0) document.querySelector('#number-of-players').textContent = `${users.length}/${party[0].max_players}`;

        const me = users.find(u => u.token === local.get('token'));
        const playBtn = document.querySelector('#play-game-btn');
        if (playBtn) {
            playBtn.classList.toggle('hidden', !(me && me.is_host));
            playBtn.style.display = me && me.is_host ? '' : 'none';
        }

        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';
        users.forEach(u => {
            const entry = document.createElement('div');
            entry.className = 'flex items-center justify-between bg-white/20 px-4 py-3 rounded-xl text-white font-medium shadow-sm border border-white/10';

            const name = document.createElement('span');
            name.textContent = u.username;
            entry.appendChild(name);

            if (u.is_host) {
                const crown = document.createElement('i');
                crown.className = 'fa-solid fa-crown text-yellow-400 text-lg';
                entry.appendChild(crown);
            }

            playerList.appendChild(entry);
        });
    }

    async function checkGameStarted() {
        try {
            const roomId = local.get('roomId');
            const party = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}&order=id.desc&limit=1`);
            if (party.length === 0) return;

            const currentPartyId = party[0].id;
            const rounds = await fetchJSON(`${API_URL}/rounds?party_id=eq.${currentPartyId}`);

            if (rounds.length > 0) {
                if (checkStartInterval) clearInterval(checkStartInterval);
                window.location.replace(`/round/?code=${roomCode}`);
            }
        } catch (e) {
            console.error('Error checking game start:', e);
        }
    }

    updatePlayerCount();

    let updatePlayersInterval = setInterval(updatePlayerCount, 1000);
    let checkStartInterval = setInterval(checkGameStarted, 1000);

    const playBtnGlobal = document.querySelector('#play-game-btn');
    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', startGame);
    }
}

if (path.includes('/round')) {
    let currentRound = parseInt(local.get('currentRound')) || 1;
    let totalRounds, roundTime, currentPartyId, currentRoundId, myUserId, myAnswer = null;
    let roundInterval = null;
    let totalUsers = 0;

    async function start() {
        myUserId = await assegurarMyUserId();
        const roomId = local.get('roomId');
        const party = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}&order=id.desc&limit=1`);
        const users = await fetchJSON(`${API_URL}/users?room_id=eq.${roomId}`);

        totalRounds = party[0].num_rounds;
        roundTime = party[0].round_time;
        currentPartyId = party[0].id;
        totalUsers = users.length;

        local.set('currentRound', currentRound);
        local.set('totalRounds', totalRounds);
        local.set('currentPartyId', currentPartyId);

        initCountdown();
    }

    function initCountdown() {
        let seconds = 3;
        const contador = document.getElementById('pantalla-comptador');
        const game = document.getElementById('contingut-joc');
        const span = document.getElementById('segons');

        const tick = () => {
            span.textContent = seconds;
            if (seconds === 0) {
                contador.classList.add('hidden');
                game.classList.remove('hidden');
                loadRound();
            } else { seconds--; setTimeout(tick, 1000); }
        };
        tick();
    }

    async function loadRound() {
        const rounds = await fetchJSON(`${API_URL}/rounds?party_id=eq.${currentPartyId}&order=id.asc`);
        if (rounds.length >= currentRound) {
            const round = rounds[currentRound - 1];
            currentRoundId = round.id;
            local.set('currentRoundId', currentRoundId);
            showRoundContent(round);
        } else {
            const res = await fetchJSON(`${API_URL}/rpc/ensure_round`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_party_id: currentPartyId, p_round_number: currentRound })
            });
            const round = await fetchJSON(`${API_URL}/rounds?id=eq.${res}`);
            currentRoundId = res;
            local.set('currentRoundId', currentRoundId);
            showRoundContent(round[0]);
        }
    }

    function showRoundContent(round) {
        const content = round.content;
        const roundContent = document.getElementById('round-content');
        const isImg = /^https?:\/\//i.test(content) || /^data:image\//i.test(content);
        const input = document.getElementById('answer-input');
        const btn = document.getElementById('submit-btn');
        roundContent.innerHTML = '';

        if (isImg) {
            const image = document.createElement('img');
            image.src = content;
            image.className = 'max-w-full h-auto max-h-96 rounded-2xl shadow-lg';
            roundContent.appendChild(image);
        } else {
            const text = document.createElement('div');
            text.className = 'text-5xl font-bold text-white text-center';
            text.textContent = content;
            roundContent.appendChild(text);
        }

        document.getElementById('round-title').textContent = `Ronda ${currentRound} de ${totalRounds}`;

        let checkAnswersInterval = null;

        const submitCurrentAnswer = async () => {
            if (myAnswer || !input.value.trim()) return;
            myAnswer = input.value.trim();
            const res = await fetch(`${API_URL}/answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: myAnswer, round_id: currentRoundId, user_id: myUserId })
            });
            if (!res.ok) {
                myAnswer = null;
                alert('No s’ha pogut guardar la resposta. Torna-ho a intentar.');
                return;
            }
            input.disabled = btn.disabled = true;
            btn.textContent = '✓ Resposta enviada';
        };

        btn.onclick = submitCurrentAnswer;

        let time = roundTime;
        const timer = document.getElementById('timer');
        roundInterval = setInterval(async () => {
            timer.textContent = --time;
            await checkIfAllAnswered();

            if (time <= 0) {
                if (checkAnswersInterval) clearInterval(checkAnswersInterval);
                clearInterval(roundInterval);
                await submitCurrentAnswer();
                window.location.replace('/answersVotes/');
            }
        }, 1000);

        checkAnswersInterval = setInterval(checkIfAllAnswered, 1000);
    }

    async function checkIfAllAnswered() {
        const answers = await fetchJSON(`${API_URL}/answers?round_id=eq.${currentRoundId}`);
        if (answers.length > 0 && totalUsers > 0 && answers.length >= totalUsers) {
            if (roundInterval) clearInterval(roundInterval);
            if (!myAnswer && input.value.trim()) {
                await submitCurrentAnswer();
            }
            window.location.replace('/answersVotes/');
        }
    }

    document.getElementById('leave-round-btn').onclick = abandonarSala;
    start();
}

if (path.includes('/answersVotes')) {
    let selectedAnswerId = null, voteTime = 30, myUserId = null, voteSubmitted = false;
    const currentRoundId = local.get('currentRoundId');
    let voteInterval = null;
    let totalUsers = 0;
    let checkVotesInterval = null;

    async function loadAnswers() {
        const answers = await fetchJSON(`${API_URL}/answers?round_id=eq.${currentRoundId}`);
        const container = document.getElementById('answers-container');
        container.innerHTML = '';

        const voteable = answers.filter(a => a.user_id !== myUserId);
        if (voteable.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-white text-center py-10';
            emptyMessage.textContent = 'No hi ha respostes per votar.';
            container.appendChild(emptyMessage);
            return;
        }

        voteable.forEach(ans => {
            const div = document.createElement('div');
            div.className = 'bg-white/20 rounded-2xl p-6 border-2 border-white/30 cursor-pointer text-white';

            const answerText = document.createElement('p');
            answerText.textContent = ans.content;
            div.appendChild(answerText);

            div.onclick = () => {
                document.querySelectorAll('#answers-container > div').forEach(d => d.classList.remove('bg-white/40', 'border-white/80'));
                div.classList.add('bg-white/40', 'border-white/80');
                selectedAnswerId = ans.id;
                document.getElementById('submit-vote-btn').disabled = false;
            };
            container.appendChild(div);
        });
    }

    async function init() {
        myUserId = await assegurarMyUserId();
        const roomId = local.get('roomId');
        const users = await fetchJSON(`${API_URL}/users?room_id=eq.${roomId}`);
        totalUsers = users.length;

        await loadAnswers();

        let remaining = voteTime;
        const timer = document.getElementById('vote-timer');
        timer.textContent = remaining;

        let checkVotesInterval = null;

        async function checkIfAllVoted() {
            const answers = await fetchJSON(`${API_URL}/answers?round_id=eq.${currentRoundId}`);
            const answerIds = answers.map(a => a.id);

            if (answerIds.length === 0) return;

            const votes = await fetchJSON(`${API_URL}/votes?answer_id=in.(${answerIds.join(',')})`);
            if (votes.length > 0 && totalUsers > 0 && votes.length >= totalUsers) {
                if (checkVotesInterval) clearInterval(checkVotesInterval);
                clearInterval(voteInterval);
                if (!voteSubmitted && selectedAnswerId) {
                    voteSubmitted = true;
                    await fetch(`${API_URL}/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_id: selectedAnswerId, user_id: myUserId }) });
                }
                window.location.replace('/ranking/');
            }
        }

        voteInterval = setInterval(async () => {
            remaining -= 1;
            timer.textContent = remaining;

            if (remaining <= 0) {
                if (checkVotesInterval) clearInterval(checkVotesInterval);
                clearInterval(voteInterval);
                if (!voteSubmitted && selectedAnswerId) {
                    voteSubmitted = true;
                    await fetch(`${API_URL}/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_id: selectedAnswerId, user_id: myUserId }) });
                }
                window.location.replace('/ranking/');
            }
        }, 1000);

        checkVotesInterval = setInterval(checkIfAllVoted, 1000);

        document.getElementById('submit-vote-btn').onclick = async () => {
            if (voteSubmitted) return;
            voteSubmitted = true;
            document.getElementById('submit-vote-btn').disabled = true;
            document.getElementById('submit-vote-btn').textContent = 'Vot enviat, esperant...';
            await fetch(`${API_URL}/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_id: selectedAnswerId, user_id: myUserId }) });
        };
    }

    document.getElementById('leave-vote-btn').onclick = abandonarSala;
    init();
}

if (path.includes('/ranking')) {
    let countdown = 5;
    const currentRound = parseInt(local.get('currentRound'), 10);
    const totalRounds = parseInt(local.get('totalRounds'), 10);

    async function init() {
        const users = await fetchJSON(`${API_URL}/users?room_id=eq.${local.get('roomId')}`);
        const answers = await fetchJSON(`${API_URL}/answers?round_id=eq.${local.get('currentRoundId')}`);
        const votes = await fetchJSON(`${API_URL}/votes`);

        const scores = {};
        answers.forEach(a => { scores[a.user_id] = 0; });

        votes.forEach(v => {
            const answer = answers.find(a => a.id === v.answer_id);
            if (answer && scores[answer.user_id] !== undefined) {
                scores[answer.user_id] += 1000;
            }
        });

        const voteCounts = {};
        votes.forEach(v => { voteCounts[v.answer_id] = (voteCounts[v.answer_id] || 0) + 1; });

        Object.entries(voteCounts).forEach(([answerId, count]) => {
            if (users.length > 2 && count === users.length - 1) {
                const answer = answers.find(a => a.id === parseInt(answerId, 10));
                if (answer) {
                    scores[answer.user_id] += Math.floor(scores[answer.user_id] * 0.1);
                }
            }
        });

        const sortedUsers = [...users].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0) || a.username.localeCompare(b.username));

        document.getElementById('round-counter').textContent = `Ronda ${currentRound} de ${totalRounds}`;

        const ranking = document.getElementById('ranking-list');
        ranking.innerHTML = '';
        sortedUsers.forEach(user => {
            const points = scores[user.id] || 0;

            const row = document.createElement('div');
            row.className = 'bg-white/20 rounded-2xl p-4 border border-white/30 backdrop-blur flex items-center justify-between';

            const name = document.createElement('span');
            name.className = 'text-xl font-bold text-white';
            setTextContent(name, user.username);

            const score = document.createElement('span');
            score.className = 'text-2xl font-bold text-yellow-300';
            setTextContent(score, `+${points}`);

            row.appendChild(name);
            row.appendChild(score);
            ranking.appendChild(row);
        });

        const timer = setInterval(() => {
            document.querySelector('#countdown span').textContent = --countdown;
            if (countdown <= 0) {
                clearInterval(timer);
                if (currentRound + 1 <= totalRounds) {
                    local.set('currentRound', (currentRound + 1).toString());
                    window.location.replace('/round/');
                } else {
                    window.location.replace('/podium/');
                }
            }
        }, 1000);
    }
    init();
}

if (path.includes('/podium')) {
    const roomCode = local.get('roomCode');

    let podiumPollInterval = setInterval(async () => {
        const roomId = local.get('roomId');
        const party = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}&order=id.desc&limit=1`);
        if (party.length === 0) return;
        const latestPartyId = party[0].id;
        const storedPartyId = local.get('currentPartyId');
        if (storedPartyId && String(latestPartyId) !== String(storedPartyId)) {
            const rounds = await fetchJSON(`${API_URL}/rounds?party_id=eq.${latestPartyId}`);
            if (rounds.length > 0) {
                clearInterval(podiumPollInterval);
                local.clearGame();
                window.location.replace(`/round/?code=${roomCode}`);
            }
        }
    }, 1000);

    (async function init() {
        const roomId = local.get('roomId');
        let currentPartyId = local.get('currentPartyId');

        if (!currentPartyId) {
            const parties = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}&order=id.desc&limit=1`);
            currentPartyId = parties[0]?.id;
        }

        const [users, rounds] = await Promise.all([
            fetchJSON(`${API_URL}/users?room_id=eq.${roomId}`),
            currentPartyId ? fetchJSON(`${API_URL}/rounds?party_id=eq.${currentPartyId}`) : []
        ]);

        const roundIds = rounds.map(r => r.id).filter(Boolean);
        const answers = roundIds.length ? await fetchJSON(`${API_URL}/answers?round_id=in.(${roundIds.join(',')})`) : [];

        const answerIds = answers.map(a => a.id).filter(Boolean);
        const votes = answerIds.length ? await fetchJSON(`${API_URL}/votes?answer_id=in.(${answerIds.join(',')})`) : [];

        const scores = Object.fromEntries(users.map(u => [u.id, 0]));

        const answersByRound = Object.groupBy ? Object.groupBy(answers, a => a.round_id) :
            answers.reduce((acc, a) => ((acc[a.round_id] ??= []).push(a), acc), {});

        Object.values(answersByRound).forEach(roundAnswers => {
            const roundScores = Object.fromEntries(users.map(u => [u.id, 0]));
            const roundVotesCount = {};

            roundAnswers.forEach(ans => {
                const ansVotes = votes.filter(v => v.answer_id === ans.id);
                roundVotesCount[ans.id] = ansVotes.length;
                roundScores[ans.user_id] += ansVotes.length * 1000;
            });

            roundAnswers.forEach(ans => {
                const totalPlayersInRound = roundAnswers.length;
                if (totalPlayersInRound > 2 && roundVotesCount[ans.id] === totalPlayersInRound - 1 && roundScores[ans.user_id] > 0) {
                    roundScores[ans.user_id] += Math.floor(roundScores[ans.user_id] * 0.1);
                }
            });

            users.forEach(u => {
                scores[u.id] += roundScores[u.id];
            });
        });

        const sortedUsers = [...users].sort((a, b) =>
            (scores[b.id] - scores[a.id]) || a.username.localeCompare(b.username)
        );

        const updatePodiumPos = (pos, user, fallback) => {
            document.getElementById(`${pos}-name`).textContent = user ? user.username : fallback;
            document.getElementById(`${pos}-score`).textContent = `${scores[user?.id] || 0} punts`;
        };
        updatePodiumPos('first', sortedUsers[0], 'Esperant...');
        updatePodiumPos('second', sortedUsers[1], '---');
        updatePodiumPos('third', sortedUsers[2], '---');

        const podiumList = document.getElementById('podium-list');
        podiumList.innerHTML = '';
        sortedUsers.forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'bg-white/10 rounded-3xl p-4 border border-white/15 backdrop-blur flex items-center justify-between';

            const info = document.createElement('div');
            const place = document.createElement('p');
            place.className = 'text-sm uppercase text-white/60';
            setTextContent(place, `${index + 1}r lloc`);

            const usernameText = document.createElement('p');
            usernameText.className = 'text-lg font-semibold text-white';
            setTextContent(usernameText, user.username);

            info.appendChild(place);
            info.appendChild(usernameText);

            const score = document.createElement('span');
            score.className = 'text-2xl font-bold text-amber-200';
            setTextContent(score, `${scores[user.id] || 0}`);

            item.appendChild(info);
            item.appendChild(score);
            podiumList.appendChild(item);
        });

        const me = users.find(u => u.token === local.get('token'));
        const newGameBtn = document.querySelector('#new-game-btn');
        if (newGameBtn) {
            newGameBtn.classList.toggle('hidden', !me?.is_host);
            newGameBtn.style.display = me?.is_host ? '' : 'none';
            if (me?.is_host) {
                newGameBtn.addEventListener('click', async () => {
                    const oldParty = await fetchJSON(`${API_URL}/parties?id=eq.${currentPartyId}`);
                    if (oldParty.length > 0) {
                        await fetch(`${API_URL}/rounds?party_id=eq.${currentPartyId}`, { method: 'DELETE' });

                        await fetch(`${API_URL}/parties`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                num_rounds: oldParty[0].num_rounds,
                                max_players: oldParty[0].max_players,
                                round_time: oldParty[0].round_time,
                                room_id: roomId,
                                modality_id: oldParty[0].modality_id
                            })
                        });
                        const newParties = await fetchJSON(`${API_URL}/parties?room_id=eq.${roomId}&order=id.desc&limit=1`);
                        if (newParties.length > 0) {
                            local.set('currentPartyId', newParties[0].id);
                            await startGame();
                        }
                    }
                });
            }
        }

        document.getElementById('leave-podium-btn').onclick = abandonarSala;
    })();
}