// Initialize LiteGraph components
const graph = new LiteGraph.LGraph();
const container = document.getElementById("graph-container");
const canvasEl = container.querySelector("canvas");
const canvas = new LiteGraph.LGraphCanvas(canvasEl, graph);

// Configure canvas interactions
canvas.allow_interaction = true;
canvas.allow_dragnodes = true;
canvas.allow_dragcanvas = true;
canvas.allow_reconnect_links = true;
canvas.multi_connection = true;
canvas.show_info = false;

// Customize context menu
LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
    const options = [];
    
    options.push({
        content: "Resize",
        callback: () => {
            node.size = node.computeSize();
            node.setDirtyCanvas(true, true);
        }
    });
    
    options.push({
        content: "Pin",
        callback: () => {
            node.pin();
        }
    });
    
    options.push({
        content: "Collapse",
        callback: () => {
            node.collapse();
        }
    });
    
    return options;
};

// Disable link context menu completely (optional)
LGraphCanvas.prototype.getLinkMenuOptions = function() {
    return [];
};

// Handle window resizing
function resizeCanvas() {
    const sidebar = document.getElementById("sidebar");
    container.style.width = `${window.innerWidth - sidebar.offsetWidth}px`;
    container.style.height = `${window.innerHeight}px`;
    canvasEl.width = container.clientWidth;
    canvasEl.height = container.clientHeight;
    
    // Update panel position on resize
    canvas.node_panel_position = [10, window.innerHeight - 220];
    
    canvas.draw(true);
}
window.addEventListener("resize", resizeCanvas);

// Configure graph for reliable updates
graph.config.always_update = true;

// Core logic gate implementation
class LogicGate {
    static evaluate(type, inputA, inputB) {
        inputA = inputA === true;
        inputB = inputB === true;
        
        switch (type) {
            case 'AND': return inputA && inputB;
            case 'OR': return inputA || inputB;
            case 'NOT': return !inputA;
            case 'XOR': return inputA !== inputB;
            case 'NAND': return !(inputA && inputB);
            case 'NOR': return !(inputA || inputB);
            default: return false;
        }
    }
}

// Core node class with guaranteed updates
class LogicNode {
    constructor(title) {
        this.title = title;
        this.size = [120, 80];
        this.properties = {};
        this.flags = { };
    }
    
    // Override in subclasses
    onExecute() {}
}

// Input node
class InputNode extends LogicNode {
    constructor() {
        super("INPUT");
        this.addOutput("", "boolean");
        this.properties = { value: false };
        this.widgets_up = true;
        this.color = "#F44336";
        
        this.addWidget("toggle", "Value", false, (v) => {
            this.properties.value = v;
            this.color = v ? "#4CAF50" : "#F44336";
            graph.runStep();
        });
    }
    
    onExecute() {
        this.setOutputData(0, this.properties.value);
    }
}

// Output node
class OutputNode extends LogicNode {
    constructor() {
        super("Output: ?");
        this.addInput("", "boolean");
        this.color = "#9E9E9E";
        this.flags = { always_update: true };
    }
    
    onExecute() {
        const value = this.getInputData(0);
        
        if (value === true) {
            this.color = "#4CAF50";
            this.title = "Output: 1";
        } else if (value === false) {
            this.color = "#F44336";
            this.title = "Output: 0";
        } else {
            this.color = "#9E9E9E";
            this.title = "Output: ?";
        }
    }
    
    onConnectionsChange() {
        graph.runStep();
    }
}

// Gate node (AND, OR, etc.)
class GateNode extends LogicNode {
    constructor(gateType) {
        super(gateType);
        
        if (gateType === 'NOT') {
            this.addInput("", "boolean");
        } else {
            this.addInput("A", "boolean");
            this.addInput("B", "boolean");
        }
        
        this.addOutput("", "boolean");
        this.gateType = gateType;
    }
    
    onExecute() {
        if (this.gateType === 'NOT') {
            const input = this.getInputData(0);
            this.setOutputData(0, LogicGate.evaluate(this.gateType, input));
        } else {
            const inputA = this.getInputData(0);
            const inputB = this.getInputData(1);
            this.setOutputData(0, LogicGate.evaluate(this.gateType, inputA, inputB));
        }
    }
    
    onConnectionsChange() {
        graph.runStep();
    }
}

// Register all node types
LiteGraph.registerNodeType("logic/INPUT", InputNode);
LiteGraph.registerNodeType("logic/OUTPUT", OutputNode);

['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR'].forEach(gateType => {
    LiteGraph.registerNodeType(`logic/${gateType}`, class extends GateNode {
        constructor() { super(gateType); }
    });
});

// Initialize UI
document.addEventListener("DOMContentLoaded", () => {
    resizeCanvas();
    graph.start();

    // Add nodes
    document.querySelectorAll(".gate-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const node = LiteGraph.createNode(`logic/${btn.dataset.gate}`);
            graph.add(node);
            node.pos = [Math.random() * 300 + 50, Math.random() * 300 + 50];
            // Add to undo history
            addToHistory();
        });
    });

    // Clear canvas
    document.getElementById("clear-btn").addEventListener("click", () => {
        graph.clear();
        canvas.draw(true);
        addToHistory();
    });

    // Undo/Redo System
    let history = [];
    let currentHistoryIndex = -1;
    const maxHistory = 100;

    function addToHistory() {
        // Remove any future states if we're in the middle of the history
        if (currentHistoryIndex < history.length - 1) {
            history = history.slice(0, currentHistoryIndex + 1);
        }

        // Add current state to history
        const state = graph.serialize();
        history.push(JSON.stringify(state));
        
        // Limit history size
        if (history.length > maxHistory) {
            history.shift();
        } else {
            currentHistoryIndex++;
        }
    }

    // Undo button
    document.getElementById("undo-btn").addEventListener("click", () => {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            const state = JSON.parse(history[currentHistoryIndex]);
            graph.configure(state);
            canvas.draw(true);
        }
    });

    // Redo button
    document.getElementById("redo-btn").addEventListener("click", () => {
        if (currentHistoryIndex < history.length - 1) {
            currentHistoryIndex++;
            const state = JSON.parse(history[currentHistoryIndex]);
            graph.configure(state);
            canvas.draw(true);
        }
    });

    // Add history entry for initial state
    addToHistory();

    // Add to history when nodes are moved or connections change
    graph.onNodeMoved = () => addToHistory();
    graph.onConnectionChange = () => addToHistory();
});

// Truth Table Generator
document.getElementById("truth-btn").addEventListener("click", () => {
    generateTruthTable();
});

function generateTruthTable() {
    // Find all input and output nodes
    const inputNodes = [];
    const outputNodes = [];
    
    for (const nodeId in graph._nodes) {
        const node = graph._nodes[nodeId];
        if (node.type === "logic/INPUT") {
            inputNodes.push(node);
        } else if (node.type === "logic/OUTPUT") {
            outputNodes.push(node);
        }
    }
    
    // Sort nodes by their x position for consistent table layout
    inputNodes.sort((a, b) => a.pos[0] - b.pos[0]);
    outputNodes.sort((a, b) => a.pos[0] - b.pos[0]);
    
    // If no inputs or outputs, show message
    if (inputNodes.length === 0 || outputNodes.length === 0) {
        document.getElementById("truth-table").innerHTML = 
            "<p>Please add at least one input and one output.</p>";
        return;
    }
    
    // Store original input values to restore later
    const originalValues = inputNodes.map(node => ({
        node: node,
        value: node.properties.value
    }));
    
    // Generate all possible input combinations
    const combinations = generateCombinations(inputNodes.length);
    
    // Results array to store each combination's output
    const results = [];
    
    // Process each combination synchronously first
    for (const combination of combinations) {
        // Set input values
        for (let i = 0; i < inputNodes.length; i++) {
            const node = inputNodes[i];
            node.properties.value = combination[i];
            if (node.widgets && node.widgets[0]) {
                node.widgets[0].value = combination[i];
            }
            node.setOutputData(0, combination[i]);
            node.color = combination[i] ? "#4CAF50" : "#F44336";
        }
        
        // Run the graph multiple times to ensure propagation
        for (let i = 0; i < 5; i++) {
            graph.runStep();
        }
        
        // Get current output values
        const outputValues = outputNodes.map(node => {
            const value = node.getInputData(0);
            return value === true;
        });
        
        // Store this combination's result
        results.push({
            inputs: [...combination],
            outputs: outputValues
        });
    }
    
    // Create table HTML
    let tableHTML = "<table border='1'><thead><tr>";
    
    // Add input headers
    for (let i = 0; i < inputNodes.length; i++) {
        tableHTML += `<th>Input ${i+1}</th>`;
    }
    
    // Add output headers
    for (let i = 0; i < outputNodes.length; i++) {
        tableHTML += `<th>Output ${i+1}</th>`;
    }
    
    tableHTML += "</tr></thead><tbody>";
    
    // Add result rows
    for (const result of results) {
        tableHTML += "<tr>";
        
        // Add input columns
        for (const input of result.inputs) {
            tableHTML += `<td>${input ? "1" : "0"}</td>`;
        }
        
        // Add output columns
        for (const output of result.outputs) {
            tableHTML += `<td>${output ? "1" : "0"}</td>`;
        }
        
        tableHTML += "</tr>";
    }
    
    tableHTML += "</tbody></table>";
    
    // Display the table
    document.getElementById("truth-table").innerHTML = tableHTML;
    
    // Restore original input values
    originalValues.forEach(item => {
        const node = item.node;
        const value = item.value;
        
        node.properties.value = value;
        if (node.widgets && node.widgets[0]) {
            node.widgets[0].value = value;
        }
        node.setOutputData(0, value);
        node.color = value ? "#4CAF50" : "#F44336";
    });
    
    // Run the graph to restore original state
    for (let i = 0; i < 5; i++) {
        graph.runStep();
    }
}

// Helper function to generate all possible boolean combinations
function generateCombinations(count) {
    const combinations = [];
    const total = Math.pow(2, count);
    
    for (let i = 0; i < total; i++) {
        const combination = [];
        for (let j = 0; j < count; j++) {
            // Check if the jth bit of i is set (reading from right to left)
            combination.push(!!(i & (1 << (count - j - 1))));
        }
        combinations.push(combination);
    }
    
    return combinations;
}