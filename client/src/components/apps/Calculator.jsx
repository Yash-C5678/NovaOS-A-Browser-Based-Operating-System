import { useEffect, useState } from "react";

function Calculator() {
    const [display, setDisplay] = useState("0");
    const [previousValue, setPreviousValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);

    const calculate = (
        first,
        second,
        operation
    ) => {
        switch (operation) {
            case "+":
                return first + second;

            case "-":
                return first - second;

            case "×":
                return first * second;

            case "÷":
                if (second === 0) {
                    return null;
                }

                return first / second;

            default:
                return second;
        }
    };

    const inputDigit = (digit) => {
        if (display === "Error") {
            setDisplay(String(digit));
            setPreviousValue(null);
            setOperator(null);
            setWaitingForOperand(false);
            return;
        }

        if (waitingForOperand) {
            setDisplay(String(digit));
            setWaitingForOperand(false);
            return;
        }

        if (display === "0") {
            setDisplay(String(digit));
        } else {
            setDisplay(
                display + String(digit)
            );
        }
    };

    const inputDecimal = () => {
        if (
            display === "Error" ||
            waitingForOperand
        ) {
            setDisplay("0.");
            setWaitingForOperand(false);
            return;
        }

        if (!display.includes(".")) {
            setDisplay(display + ".");
        }
    };

    const clearCalculator = () => {
        setDisplay("0");
        setPreviousValue(null);
        setOperator(null);
        setWaitingForOperand(false);
    };

    const backspace = () => {
        if (
            display === "Error" ||
            waitingForOperand
        ) {
            return;
        }

        if (display.length <= 1) {
            setDisplay("0");
            return;
        }

        const nextValue =
            display.slice(0, -1);

        setDisplay(
            nextValue === "-" ||
                nextValue === ""
                ? "0"
                : nextValue
        );
    };

    const toggleSign = () => {
        if (
            display === "0" ||
            display === "Error"
        ) {
            return;
        }

        setDisplay(
            display.startsWith("-")
                ? display.slice(1)
                : `-${display}`
        );
    };

    const percentage = () => {
        if (
            display === "Error"
        ) {
            return;
        }

        const value =
            Number(display) / 100;

        setDisplay(
            String(value)
        );
    };

    const handleOperator = (
        nextOperator
    ) => {
        if (display === "Error") {
            return;
        }

        const inputValue =
            Number(display);

        if (
            previousValue !== null &&
            operator &&
            !waitingForOperand
        ) {
            const result =
                calculate(
                    previousValue,
                    inputValue,
                    operator
                );

            if (result === null) {
                setDisplay("Error");
                setPreviousValue(null);
                setOperator(null);
                setWaitingForOperand(true);
                return;
            }

            setDisplay(
                String(result)
            );

            setPreviousValue(result);
        } else {
            setPreviousValue(inputValue);
        }

        setOperator(nextOperator);
        setWaitingForOperand(true);
    };

    const handleEquals = () => {
        if (
            display === "Error" ||
            previousValue === null ||
            operator === null
        ) {
            return;
        }

        const inputValue =
            Number(display);

        const result =
            calculate(
                previousValue,
                inputValue,
                operator
            );

        if (result === null) {
            setDisplay("Error");
        } else {
            setDisplay(
                String(result)
            );
        }

        setPreviousValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    };

    const handleButton = (
        value
    ) => {
        if (
            value >= "0" &&
            value <= "9"
        ) {
            inputDigit(value);
            return;
        }

        switch (value) {
            case ".":
                inputDecimal();
                break;

            case "+":
            case "-":
            case "×":
            case "÷":
                handleOperator(value);
                break;

            case "=":
                handleEquals();
                break;

            case "C":
                clearCalculator();
                break;

            case "⌫":
                backspace();
                break;

            case "%":
                percentage();
                break;

            case "±":
                toggleSign();
                break;

            default:
                break;
        }
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key;

            if (
                key >= "0" &&
                key <= "9"
            ) {
                inputDigit(key);
                return;
            }

            if (key === ".") {
                inputDecimal();
                return;
            }

            if (
                key === "+" ||
                key === "-"
            ) {
                handleOperator(key);
                return;
            }

            if (key === "*") {
                handleOperator("×");
                return;
            }

            if (key === "/") {
                event.preventDefault();
                handleOperator("÷");
                return;
            }

            if (
                key === "Enter" ||
                key === "="
            ) {
                handleEquals();
                return;
            }

            if (
                key === "Escape" ||
                key.toLowerCase() === "c"
            ) {
                clearCalculator();
                return;
            }

            if (key === "Backspace") {
                backspace();
                return;
            }

            if (key === "%") {
                percentage();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () =>
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
    });


    const buttons = [
        ["C", "⌫", "%", "÷"],
        ["7", "8", "9", "×"],
        ["4", "5", "6", "-"],
        ["1", "2", "3", "+"],
        ["±", "0", ".", "="]
    ];


    return (
        <div className="nova-calculator">

            <style>{`
                .nova-calculator {
                    width: 100%;
                    height: 100%;
                    min-height: 420px;
                    display: flex;
                    flex-direction: column;
                    padding: 18px;
                    box-sizing: border-box;
                    background: var(--nova-bg-1, #0d1324);
                    color: var(--nova-text, #f1f5ff);
                    font-family:
                        Inter,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }

                .calculator-display {
                    min-height: 105px;
                    padding: 18px;
                    margin-bottom: 14px;
                    border-radius: 14px;
                    background: var(--nova-surface-strong, #171e32);
                    border: 1px solid var(--nova-border, #252f48);
                    color: var(--nova-text, #f1f5ff);
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    align-items: flex-end;
                    overflow: hidden;
                    box-sizing: border-box;
                }

                .calculator-operation {
                    min-height: 22px;
                    width: 100%;
                    text-align: right;
                    color: var(--nova-text-muted, #71809a);
                    font-size: 13px;
                    margin-bottom: 6px;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                .calculator-value {
                    width: 100%;
                    text-align: right;
                    font-size: 34px;
                    font-weight: 600;
                    line-height: 1.1;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                .calculator-grid {
                    flex: 1;
                    display: grid;
                    grid-template-columns:
                        repeat(4, 1fr);
                    gap: 10px;
                }

                .calculator-button {
                    border: 1px solid var(--nova-border, #252f48);
                    border-radius: 12px;
                    background: var(--nova-surface, #12182a);
                    color: var(--nova-text, #f1f5ff);
                    font-size: 20px;
                    font-weight: 500;
                    cursor: pointer;
                    transition:
                        transform 0.08s ease,
                        background 0.12s ease,
                        border-color 0.12s ease;
                    min-height: 54px;
                }

                .calculator-button:hover {
                    background: var(--nova-surface-hover, #1d2640);
                    border-color: var(--nova-border-hover, #3b496c);
                }

                .calculator-button:active {
                    transform: scale(0.96);
                }

                .calculator-button.function {
                    font-size: 17px;
                    background: var(--nova-surface-strong, #171e32);
                    color: var(--nova-text-secondary, #aebbd1);
                }

                .calculator-button.operator {
                    background: var(--nova-surface-strong, #171e32);
                    color: var(--nova-accent, #3b82f6);
                    font-weight: 600;
                }

                .calculator-button.equals {
                    background: var(--nova-accent, #3b82f6);
                    color: white;
                    border-color: var(--nova-accent, #3b82f6);
                    font-weight: 600;
                }

                .calculator-button.equals:hover {
                    background: var(--nova-accent-hover, #2563eb);
                }

                .calculator-button.zero {
                    grid-column: span 1;
                }

                .calculator-footer {
                    margin-top: 12px;
                    text-align: center;
                    font-size: 11px;
                    color: var(--nova-text-muted, #71809a);
                }

                @media (max-width: 420px) {
                    .nova-calculator {
                        padding: 12px;
                    }

                    .calculator-display {
                        min-height: 90px;
                    }

                    .calculator-value {
                        font-size: 28px;
                    }

                    .calculator-button {
                        min-height: 48px;
                        font-size: 18px;
                    }
                }
            `}</style>


            <div className="calculator-display">

                <div className="calculator-operation">
                    {previousValue !== null &&
                        operator
                        ? `${previousValue} ${operator}`
                        : ""}
                </div>

                <div className="calculator-value">
                    {display}
                </div>

            </div>


            <div className="calculator-grid">

                {buttons.flatMap(
                    (row) =>
                        row.map(
                            (button) => {
                                const isFunction =
                                    [
                                        "C",
                                        "⌫",
                                        "%",
                                        "±"
                                    ].includes(
                                        button
                                    );

                                const isOperator =
                                    [
                                        "÷",
                                        "×",
                                        "-",
                                        "+"
                                    ].includes(
                                        button
                                    );

                                const isEquals =
                                    button === "=";

                                return (
                                    <button
                                        key={button}
                                        type="button"
                                        className={[
                                            "calculator-button",
                                            isFunction
                                                ? "function"
                                                : "",
                                            isOperator
                                                ? "operator"
                                                : "",
                                            isEquals
                                                ? "equals"
                                                : "",
                                            button === "0"
                                                ? "zero"
                                                : ""
                                        ]
                                            .filter(
                                                Boolean
                                            )
                                            .join(" ")}
                                        onClick={() =>
                                            handleButton(
                                                button
                                            )
                                        }
                                    >
                                        {button}
                                    </button>
                                );
                            }
                        )
                )}

            </div>


            <div className="calculator-footer">
                Keyboard input supported
            </div>

        </div>
    );
}

export default Calculator;