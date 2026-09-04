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
                    background: #f5f7fa;
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
                    background: #111827;
                    color: white;
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
                    color: #9ca3af;
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
                    border: 1px solid #d8dde5;
                    border-radius: 12px;
                    background: white;
                    color: #1f2937;
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
                    background: #eef2f7;
                    border-color: #c7ced8;
                }

                .calculator-button:active {
                    transform: scale(0.96);
                }

                .calculator-button.function {
                    font-size: 17px;
                    background: #e9edf3;
                }

                .calculator-button.operator {
                    background: #e6ebf2;
                    font-weight: 600;
                }

                .calculator-button.equals {
                    background: #111827;
                    color: white;
                    border-color: #111827;
                    font-weight: 600;
                }

                .calculator-button.equals:hover {
                    background: #1f2937;
                }

                .calculator-button.zero {
                    grid-column: span 1;
                }

                .calculator-footer {
                    margin-top: 12px;
                    text-align: center;
                    font-size: 11px;
                    color: #8a94a3;
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