window.gameApp = {
    ROW_HEIGHT: 50, 
    TOTAL_ROWS: 5,  

    currentPositions: [0, 0, 0, 0, 0, 0, 0],
    isAutoSpinning: false,
    audioContext: null,

    getSlots: function() {
        return [
            document.getElementById('game-slot1'),
            document.getElementById('game-slot2'),
            document.getElementById('game-slot3'),
            document.getElementById('game-slot4'),
            document.getElementById('game-slot5'),
            document.getElementById('game-slot6'),
            document.getElementById('game-slot7')
        ];
    },

    playClick: function() {
        if (!window.gameApp.audioContext) {
            window.gameApp.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (window.gameApp.audioContext.state === 'suspended') {
            window.gameApp.audioContext.resume();
        }
        
        const oscillator = window.gameApp.audioContext.createOscillator();
        const gain = window.gameApp.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, window.gameApp.audioContext.currentTime);
        
        gain.gain.setValueAtTime(1, window.gameApp.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, window.gameApp.audioContext.currentTime + 0.1);
        
        oscillator.connect(gain);
        gain.connect(window.gameApp.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(window.gameApp.audioContext.currentTime + 0.1);
    },

    startAudio: function() {
        if (!window.gameApp.audioContext) {
            window.gameApp.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    spin: function() {
        const autoRollButton = document.getElementById('game-autoRoll');
        autoRollButton.disabled = true;
        
        const results = [];
        const slots = window.gameApp.getSlots();

        slots.forEach((slot, index) => {
            if (!slot) return;

            const randomRow = Math.floor(Math.random() * window.gameApp.TOTAL_ROWS);
            results.push(randomRow);

            let rowsToMove = randomRow - (window.gameApp.currentPositions[index] % window.gameApp.TOTAL_ROWS);
            if (rowsToMove <= 0) {
                rowsToMove += window.gameApp.TOTAL_ROWS; 
            }

            const extraSpins = (3 + index) * window.gameApp.TOTAL_ROWS; 
            
            const targetRows = rowsToMove + extraSpins;
            window.gameApp.currentPositions[index] += targetRows;

            let totalDurationMs = (1 + index * 0.4) * 1000;
            let timePerBlock = totalDurationMs / targetRows;

            for (let i = 1; i <= targetRows; i++) {
                setTimeout(() => {
                    window.gameApp.playClick();
                }, i * timePerBlock);
            }

            const targetY = -(window.gameApp.currentPositions[index] * window.gameApp.ROW_HEIGHT) + 100;

            slot.style.transition = `background-position-y ${1 + index * 0.4}s ease-out`;
            slot.style.backgroundPositionY = `${targetY}px`;
        });

        const totalDuration = (1 + (slots.length - 1) * 0.4) * 1000;
        
        setTimeout(() => {
            const isWin = results.every(val => val === results[0]);
            
            if (isWin) {
                alert('you win!');
                autoRollButton.disabled = false;
                window.gameApp.isAutoSpinning = false;
            } else {
                if (window.gameApp.isAutoSpinning) {
                    setTimeout(window.gameApp.spin, 200); 
                } else {
                    autoRollButton.disabled = false;
                }
            }
        }, totalDuration);
    },

    init: function() {
        const autoRollButton = document.getElementById('game-autoRoll');
        if (autoRollButton) {
            autoRollButton.onclick = () => {
                window.gameApp.startAudio();
                window.gameApp.isAutoSpinning = true;
                window.gameApp.spin();
            };
        }
    }
};

window.gameApp.init();