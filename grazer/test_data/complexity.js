function simple() {
    return true;
}

function medium(a) {
    if (a) { // +1
        return 1;
    }
    return 0;
}

function complex(a, b) {
    if (a) { // +1
        if (b) { // +1
            return 2;
        }
    } else if (b) { // +1
        return 1;
    }
    return 0;
}
// Base complexity 1 per function file context? 
// Wait, ts.createSourceFile makes a whole source file.
// The visitor visits the whole file. 
// File starts with complexity 1.
// medium: IF (+1)
// complex: IF (+1), IF (+1), ELSE IF (part of if? No, usually distinct check implies complexity).
// Actually `else if` is usually parsed as `IfStatement` inside an `Else` block in AST, or similar.
// Let's verify standard complexity rules:
// Base 1.
// +1 for each branch (if, for, while, case, catch, ternary, bool op).
// Total expected:
// Base: 1
// simple: 0
// medium: 1 (if)
// complex: 
//   if (a) -> +1
//   if (b) -> +1
//   else if (b) -> +1 (it's another if)
// Total complexity additions: 3
// Total file complexity: 1 + 3 = 4.
