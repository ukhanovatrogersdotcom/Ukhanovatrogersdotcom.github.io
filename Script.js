document.addEventListener('DOMContentLoaded', () => {
    const videoFeed = document.getElementById('videoFeed');
    const simulationCanvas = document.getElementById('simulationCanvas');
    const ctx = simulationCanvas.getContext('2d');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const startSimulationBtn = document.getElementById('startSimulationBtn');
    const stopBtn = document.getElementById('stopBtn');
    const numVehiclesSpan = document.getElementById('numVehicles');
    const longestTrackedDurationSpan = document.getElementById('longestTrackedDuration');
    const mostFrequentProximitySpan = document.getElementById('mostFrequentProximity');
    const analysisOutput = document.getElementById('analysisOutput');

    let currentStream = null;
    let animationFrameId = null;
    let vehicles = []; // Conceptual vehicles for simulation
    const MAX_VEHICLES = 3;
    const VEHICLE_SPEED = 1; // pixels per frame
    const VIDEO_WIDTH = 640;
    const VIDEO_HEIGHT = 360;

    // Set canvas dimensions
    simulationCanvas.width = VIDEO_WIDTH;
    simulationCanvas.height = VIDEO_HEIGHT;
    videoFeed.width = VIDEO_WIDTH;
    videoFeed.height = VIDEO_HEIGHT;

    // Common car colors for simulation (hex values for drawing)
    const CAR_COLORS = [
        '#C0C0C0', // Silver
        '#2C3E50', // Dark Blue/Grey
        '#FF0000', // Red
        '#000000', // Black
        '#FFFFFF', // White
        '#808080', // Grey
        '#008000', // Green
        '#FFFF00', // Yellow
        '#ADD8E6'  // Light Blue
    ];

    // --- Utility Functions ---
    function resetAppState() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            videoFeed.srcObject = null;
            currentStream = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        vehicles = [];
        ctx.clearRect(0, 0, simulationCanvas.width, simulationCanvas.height); // Clear canvas
        videoFeed.style.display = 'none';
        simulationCanvas.style.display = 'none';
        updateStats(0, 0, 'N/A');
        analysisOutput.textContent = 'Press "Start Camera Feed" or "Start Simulation" to begin.';
        analysisOutput.style.color = '#ffb86c'; // Reset analysis text color
    }

    function updateStats(num, longestDur, mostFreqProx) {
        numVehiclesSpan.textContent = num;
        longestTrackedDurationSpan.textContent = `${longestDur}s`;
        mostFrequentProximitySpan.textContent = mostFreqProx;
    }

    function getProximity(y) {
        if (y > simulationCanvas.height * 0.7) return 'Close';
        if (y > simulationCanvas.height * 0.3) return 'Medium';
        return 'Far';
    }

    function updateAnalysis() {
        const num = vehicles.length;
        const longestDur = parseFloat(longestTrackedDurationSpan.textContent); // Get value from UI
        const mostFreqProx = mostFrequentProximitySpan.textContent;

        if (num === 0) {
            analysisOutput.textContent = 'No vehicles detected.';
            analysisOutput.style.color = '#ffb86c';
        } else if (num === 1) {
            if (longestDur >= 10 && mostFreqProx === 'Close') {
                analysisOutput.textContent = '🚩 Potential consistent follower detected: One vehicle has been close for an extended period.';
                analysisOutput.style.color = '#ff5555';
            } else if (longestDur >= 5) {
                analysisOutput.textContent = '⚠️ One vehicle consistently behind. Monitoring...';
                analysisOutput.style.color = '#ffb86c';
            } else {
                analysisOutput.textContent = 'One vehicle detected. Normal movement.';
                analysisOutput.style.color = '#50fa7b';
            }
        } else if (num > 1) {
            if (num >= MAX_VEHICLES && longestDur >= 15) {
                analysisOutput.textContent = 'Normal traffic flow. Multiple vehicles detected.';
                analysisOutput.style.color = '#50fa7b';
            } else {
                analysisOutput.textContent = 'Multiple vehicles detected. Traffic flow appears normal.';
                analysisOutput.style.color = '#50fa7b';
            }
        }
    }

    // --- Camera Feed Logic ---
    async function startCameraFeed() {
        resetAppState(); // Reset previous state
        videoFeed.style.display = 'block';
        simulationCanvas.style.display = 'none';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoFeed.srcObject = stream;
            currentStream = stream;
            videoFeed.onloadedmetadata = () => {
                videoFeed.play();
                analysisOutput.textContent = 'Camera feed active. Visualizing conceptual vehicle data... (No real LPR or color detection)';
                analysisOutput.style.color = '#8be9fd';
                // Simulate some activity for statistics for the camera feed
                let cameraActiveTime = 0;
                let intervalId = setInterval(() => {
                    cameraActiveTime++;
                    // In camera mode, we can't do real vehicle detection, LPR, or accurate color detection.
                    // So we simulate conceptual "presence" and "duration."
                    let currentVehicles = Math.min(Math.floor(Math.random() * (MAX_VEHICLES + 1)), MAX_VEHICLES); // Random 0-MAX
                    let prox = ['Close', 'Medium', 'Far'][Math.floor(Math.random() * 3)];
                    updateStats(currentVehicles, cameraActiveTime, prox);
                    updateAnalysis();
                    if (!currentStream) clearInterval(intervalId); // Stop if stream is gone
                }, 1000);
            };
        } catch (err) {
            console.error("Error accessing camera: ", err);
            analysisOutput.textContent = 'Error: Could not access camera. Make sure permissions are granted.';
            analysisOutput.style.color = '#ff5555';
        }
    }

    // --- Simulation Logic ---
    function generateRandomLicensePlate() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let plate = '';
        // Common plate format: AAA-111 or 111-AAA (conceptual)
        for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
        plate += '-';
        for (let i = 0; i < 3; i++) plate += numbers[Math.floor(Math.random() * numbers.length)];
        return plate;
    }

    function generateNewVehicle() {
        return {
            id: Date.now() + Math.random(),
            x: Math.random() * (simulationCanvas.width - 70), // Leave space for plate
            y: -80, // Start above canvas
            width: 70 + Math.random() * 30, // Make it wider to accommodate plate
            height: 80 + Math.random() * 40,
            bodyColor: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], // Assign a random color
            entryTime: Date.now(),
            licensePlate: generateRandomLicensePlate() // Assign a simulated license plate
        };
    }

    function animateSimulation() {
        ctx.clearRect(0, 0, simulationCanvas.width, simulationCanvas.height);
        ctx.fillStyle = '#000'; // Black background for "road"
        ctx.fillRect(0, 0, simulationCanvas.width, simulationCanvas.height);

        // Remove vehicles that have left the screen
        vehicles = vehicles.filter(v => v.y < simulationCanvas.height + v.height);

        // Add new vehicles if below max
        if (vehicles.length < MAX_VEHICLES && Math.random() < 0.015) { // Slightly lower chance to add new vehicles
            vehicles.push(generateNewVehicle());
        }

        let longestDuration = 0;
        let proximityCounts = { 'Close': 0, 'Medium': 0, 'Far': 0, 'N/A': 0 };

        vehicles.forEach(vehicle => {
            vehicle.y += VEHICLE_SPEED; // Move vehicle down

            // Draw vehicle body with its assigned color
            ctx.fillStyle = vehicle.bodyColor;
            ctx.fillRect(vehicle.x, vehicle.y, vehicle.width, vehicle.height);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(vehicle.x, vehicle.y, vehicle.width, vehicle.height);

            // Draw conceptual license plate
            ctx.fillStyle = '#f0f0f0'; // Plate background color
            const plateWidth = Math.min(vehicle.width * 0.8, 60); // Max plate width
            const plateHeight = Math.min(vehicle.height * 0.2, 20); // Max plate height
            const plateX = vehicle.x + (vehicle.width - plateWidth) / 2;
            const plateY = vehicle.y + vehicle.height - plateHeight - 5; // Position near bottom
            
            if (plateY > vehicle.y + vehicle.height / 2) { // Only draw if visible and not too high
                ctx.fillRect(plateX, plateY, plateWidth, plateHeight);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(plateX, plateY, plateWidth, plateHeight);

                ctx.fillStyle = '#000'; // Plate text color
                ctx.font = `${Math.max(8, plateHeight * 0.7)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(vehicle.licensePlate, plateX + plateWidth / 2, plateY + plateHeight / 2);
            }

            // Update stats for each vehicle
            const duration = Math.floor((Date.now() - vehicle.entryTime) / 1000);
            if (duration > longestDuration) {
                longestDuration = duration;
            }
            const currentProximity = getProximity(vehicle.y);
            proximityCounts[currentProximity]++;
        });

        // Determine most frequent proximity
        let mostFrequentProximity = 'N/A';
        let maxCount = 0;
        for (const prox in proximityCounts) {
            if (proximityCounts[prox] > maxCount && prox !== 'N/A') {
                maxCount = proximityCounts[prox];
                mostFrequentProximity = prox;
            }
        }
        if (maxCount === 0 && vehicles.length === 0) mostFrequentProximity = 'N/A';
        else if (maxCount === 0 && vehicles.length > 0) mostFrequentProximity = 'Varying';


        updateStats(vehicles.length, longestDuration, mostFrequentProximity);
        updateAnalysis();

        animationFrameId = requestAnimationFrame(animateSimulation);
    }

    function startSimulation() {
        resetAppState(); // Reset previous state
        videoFeed.style.display = 'none';
        simulationCanvas.style.display = 'block';
        vehicles = [];
        animationFrameId = requestAnimationFrame(animateSimulation);
        analysisOutput.textContent = 'Simulation active. Observing conceptual vehicle data with simulated plates & colors...';
        analysisOutput.style.color = '#8be9fd';
    }

    // --- Event Listeners ---
    startCameraBtn.addEventListener('click', startCameraFeed);
    startSimulationBtn.addEventListener('click', startSimulation);
    stopBtn.addEventListener('click', resetAppState);
});
