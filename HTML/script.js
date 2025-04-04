/* Setup and initialization of LiteGraph components */
const graph = new LiteGraph.LGraph();
const container = document.getElementById("graph-container");
const canvasEl = container.querySelector("canvas");
const canvas = new LiteGraph.LGraphCanvas(canvasEl, graph);

/* Basic canvas configuration */
canvas.allow_interaction = true;
canvas.allow_dragnodes = true;
canvas.allow_dragcanvas = true;
canvas.allow_reconnect_links = true;
canvas.multi_connection = true;
canvas.show_info = false;

/* Context menu configuration for nodes */
LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
    const options = [];
    
    options.push({
        content: "Delete",
        callback: () => {
            node.graph.remove(node);
            node.graph.runStep();
            addToHistory();
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

/* Disable connection context menu */
LGraphCanvas.prototype.getLinkMenuOptions = function() {
    return [];
};

/* Canvas resize handling */
function resizeCanvas() {
    const sidebar = document.getElementById("sidebar");
    container.style.width = `${window.innerWidth - sidebar.offsetWidth}px`;
    container.style.height = `${window.innerHeight}px`;
    canvasEl.width = container.clientWidth;
    canvasEl.height = container.clientHeight;
    canvas.node_panel_position = [10, window.innerHeight - 220];
    canvas.draw(true);
}
window.addEventListener("resize", resizeCanvas);

/* Graph update configuration */
graph.config.always_update = true;

/* Logic gate evaluation class */
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

/* Base node class definition */
class LogicNode {
    constructor(title) {
        this.title = title;
        this.size = [120, 80];
        this.properties = {};
        this.flags = { };
    }
    
    onExecute() {}
}

/* Input node implementation */
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

/* Output node implementation */
class OutputNode extends LogicNode {
    constructor() {
        super("Output");
        this.addInput("", "boolean");
        this.color = "#9E9E9E";
        this.title = "Output";
        this.title_color = "black";
        this.flags = { always_run: true };
    }
    
    onExecute() {
        const value = this.getInputData(0);
        if (value === null || value === undefined) {
            this.color = "#9E9E9E";
            this.title = "Output";
            this.title_color = "black";
        } else {
            this.color = value ? "#4CAF50" : "#F44336";
            this.title = `Output: ${value ? "1" : "0"}`;
            this.title_color = "white";
        }
        this.setDirtyCanvas(true, true);
        canvas.draw(true);
    }
    
    onConnectionsChange() {
        graph.runStep();
    }
}

/* Logic gate node implementation */
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

/* Register node types with LiteGraph */
LiteGraph.registerNodeType("logic/INPUT", InputNode);
LiteGraph.registerNodeType("logic/OUTPUT", OutputNode);

['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR'].forEach(gateType => {
    LiteGraph.registerNodeType(`logic/${gateType}`, class extends GateNode {
        constructor() { super(gateType); }
    });
});

/* Main UI initialization and event handling */
document.addEventListener("DOMContentLoaded", () => {
    resizeCanvas();
    graph.start();

    document.querySelectorAll(".gate-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const node = LiteGraph.createNode(`logic/${btn.dataset.gate}`);
            graph.add(node);
            node.pos = [Math.random() * 300 + 50, Math.random() * 300 + 50];
            addToHistory();
        });
    });

    document.getElementById("clear-btn").addEventListener("click", () => {
        graph.clear();
        canvas.draw(true);
        addToHistory();
    });

    let history = [];
    let currentHistoryIndex = -1;
    const maxHistory = 100;

    function addToHistory() {
        if (currentHistoryIndex < history.length - 1) {
            history = history.slice(0, currentHistoryIndex + 1);
        }

        const state = graph.serialize();
        history.push(JSON.stringify(state));
        
        if (history.length > maxHistory) {
            history.shift();
        } else {
            currentHistoryIndex++;
        }
    }

    document.getElementById("undo-btn").addEventListener("click", () => {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            const state = JSON.parse(history[currentHistoryIndex]);
            graph.configure(state);
            canvas.draw(true);
        }
    });

    document.getElementById("redo-btn").addEventListener("click", () => {
        if (currentHistoryIndex < history.length - 1) {
            currentHistoryIndex++;
            const state = JSON.parse(history[currentHistoryIndex]);
            graph.configure(state);
            canvas.draw(true);
        }
    });

    addToHistory();

    graph.onNodeMoved = () => addToHistory();
    graph.onConnectionChange = () => addToHistory();
});

/* Truth table generation */
document.getElementById("truth-btn").addEventListener("click", () => {
    generateTruthTable();
});

function generateTruthTable() {
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
    
    inputNodes.sort((a, b) => a.pos[0] - b.pos[0]);
    outputNodes.sort((a, b) => a.pos[0] - b.pos[0]);
    
    if (inputNodes.length === 0 || outputNodes.length === 0) {
        document.getElementById("truth-table").innerHTML = 
            "<p>Please add at least one input and one output.</p>";
        return;
    }
    
    const originalValues = inputNodes.map(node => ({
        node: node,
        value: node.properties.value
    }));
    
    const combinations = generateCombinations(inputNodes.length);
    const results = [];
    
    for (const combination of combinations) {
        for (let i = 0; i < inputNodes.length; i++) {
            const node = inputNodes[i];
            node.properties.value = combination[i];
            if (node.widgets && node.widgets[0]) {
                node.widgets[0].value = combination[i];
            }
            node.setOutputData(0, combination[i]);
            node.color = combination[i] ? "#4CAF50" : "#F44336";
        }
        
        for (let i = 0; i < 5; i++) {
            graph.runStep();
        }
        
        const outputValues = outputNodes.map(node => {
            const value = node.getInputData(0);
            return value === true;
        });
        
        results.push({
            inputs: [...combination],
            outputs: outputValues
        });
    }
    
    let tableHTML = "<table border='1'><thead><tr>";
    
    for (let i = 0; i < inputNodes.length; i++) {
        tableHTML += `<th>Input ${i+1}</th>`;
    }
    
    for (let i = 0; i < outputNodes.length; i++) {
        tableHTML += `<th>Output ${i+1}</th>`;
    }
    
    tableHTML += "</tr></thead><tbody>";
    
    for (const result of results) {
        tableHTML += "<tr>";
        
        for (const input of result.inputs) {
            tableHTML += `<td>${input ? "1" : "0"}</td>`;
        }
        
        for (const output of result.outputs) {
            tableHTML += `<td>${output ? "1" : "0"}</td>`;
        }
        
        tableHTML += "</tr>";
    }
    
    tableHTML += "</tbody></table>";
    
    document.getElementById("truth-table").innerHTML = tableHTML;
    
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
    
    for (let i = 0; i < 5; i++) {
        graph.runStep();
    }
}

/* Boolean combination generator */
function generateCombinations(count) {
    const combinations = [];
    const total = Math.pow(2, count);
    
    for (let i = 0; i < total; i++) {
        const combination = [];
        for (let j = 0; j < count; j++) {
            combination.push(!!(i & (1 << (count - j - 1))));
        }
        combinations.push(combination);
    }
    
    return combinations;
}