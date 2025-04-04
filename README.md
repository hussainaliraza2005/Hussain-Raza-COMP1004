# Logic Gate Simulator 🎮

A website used for designing digital logic diagram circuits while automatically generating truth tables. Perfect for students and educators to visualize and validate logic gate interactions.

## Features ✨
- **Drag-and-Drop Interface**: Build circuits using AND, OR, and NOT gates.
- **Real-Time Truth Tables**: Automatically generates tables for 2–8 inputs.
- **Input Validation**: Blocks invalid connections (e.g., 3 inputs to a NOT gate).
- **Undo/Redo Buttons**: Revert changes with one click.
  
### Build Your First Circuit  
1. **Add an Input Node**  
   - Drag an **Input Node** from the toolbar to the canvas.  
   - Click its red/green button to toggle between `0` (off) and `1` (on).  

2. **Add a Logic Gate**  
   - Drag an **AND**, **OR**, or **NOT** gate to the canvas.  

3. **Connect Them**  
   - Click and drag **from the Input Node** to the **left side of the gate**.  

4. **Add an Output Node**  
   - Drag an **Output Node** to the canvas.  
   - Connect the **right side of the gate** to the Output Node.  

5. **Test It!**  
   - Toggle the Input Node → Watch the Output Node change.  

---

### Generate a Truth Table  
1. Build your circuit (input → gate → output).  
2. Click the **"Truth Table"** button.  
3. See all possible input combinations and outputs instantly.  


### Fix Mistakes  
- **Undo Button**: Click to undo the last action.  
- **Delete Wires/Gates**: Right-click → "Delete".  
- **Invalid Connections**: Blocked automatically (e.g., too many inputs to a NOT gate).  

- **Invalid Connections**:  
  If you try to connect incompatible nodes (e.g., 3 inputs to a NOT gate):  
  - The system will block the connection.  
  - An error message appears (e.g., *"NOT gates accept 1 input only!"*).

