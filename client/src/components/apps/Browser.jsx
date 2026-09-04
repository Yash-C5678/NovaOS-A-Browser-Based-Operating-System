import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import NovaIcon from "../ui/NovaIcon";


const API_BASE = "/api";


function clamp(
    value,
    minimum,
    maximum
) {
    return Math.max(
        minimum,
        Math.min(
            maximum,
            value
        )
    );
}


function createObstacle(
    gameWidth,
    difficulty
) {
    const height =
        28 +
        Math.random() * 34;

    const width =
        16 +
        Math.random() * 18;

    return {
        id:
            `${Date.now()}-${Math.random()}`,
        x:
            gameWidth + 40,
        width,
        height,
        speed:
            5 + difficulty
    };
}


function formatScore(
    score
) {
    return String(
        Math.max(
            0,
            Math.floor(score)
        )
    ).padStart(
        5,
        "0"
    );
}


function DinoCharacter({
    jumping,
    ducking,
    gameOver,
    x,
    y,
    gameWidth
}) {
    const visualHeight =
        ducking
            ? 38
            : 56;

    const visualBottom =
        Math.max(
            0,
            300 -
                y -
                visualHeight
        );

    const visualLeft =
        Math.max(
            0,
            Math.min(
                100,
                (x /
                    Math.max(
                        gameWidth,
                        1
                    )) *
                    100
            )
        );

    return (
        <div
            className={[
                "nova-dino",
                jumping
                    ? "jumping"
                    : "",
                ducking
                    ? "ducking"
                    : "",
                gameOver
                    ? "game-over"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
            style={{
                left:
                    `${visualLeft}%`,
                bottom:
                    `${visualBottom}px`
            }}
        >
            <div className="nova-dino-head">
                <span className="nova-dino-eye" />
            </div>

            <div className="nova-dino-body">
                <span className="nova-dino-arm nova-dino-arm-one" />
                <span className="nova-dino-arm nova-dino-arm-two" />
            </div>

            <div className="nova-dino-leg nova-dino-leg-one" />
            <div className="nova-dino-leg nova-dino-leg-two" />

            <div className="nova-dino-tail" />
        </div>
    );
}


function OfflineDinoGame() {
    const GAME_WIDTH = 900;
    const GAME_HEIGHT = 300;
    const GROUND_Y = 238;

    const gameRef =
        useRef(null);

    const animationRef =
        useRef(null);

    const lastFrameRef =
        useRef(0);

    const playerRef =
        useRef({
            x: 90,
            y: GROUND_Y - 54,
            width: 38,
            height: 54,
            velocityY: 0,
            jumping: false,
            ducking: false
        });

    const obstaclesRef =
        useRef([]);

    const scoreRef =
        useRef(0);

    const renderedScoreRef =
        useRef(0);

    const bestScoreRef =
        useRef(
            Number(
                sessionStorage.getItem(
                    "novaos-dino-best-score"
                ) || 0
            )
        );

    const startedRef =
        useRef(false);

    const gameOverRef =
        useRef(false);

    const [started, setStarted] =
        useState(false);

    const [gameOver, setGameOver] =
        useState(false);

    const [score, setScore] =
        useState(0);

    const [bestScore, setBestScore] =
        useState(
            bestScoreRef.current
        );

    const [player, setPlayer] =
        useState(
            playerRef.current
        );

    const [obstacles, setObstacles] =
        useState([]);

    const [gameWidth, setGameWidth] =
        useState(GAME_WIDTH);

    const [gameHeight, setGameHeight] =
        useState(GAME_HEIGHT);


    const resetGame = useCallback(
        () => {
            if (
                animationRef.current
            ) {
                cancelAnimationFrame(
                    animationRef.current
                );
            }

            playerRef.current = {
                x: 90,
                y:
                    GROUND_Y - 54,
                width: 38,
                height: 54,
                velocityY: 0,
                jumping: false,
                ducking: false
            };

            obstaclesRef.current =
                [];

            scoreRef.current =
                0;

            renderedScoreRef.current =
                0;

            startedRef.current =
                false;

            gameOverRef.current =
                false;

            lastFrameRef.current =
                0;

            setStarted(
                false
            );

            setGameOver(
                false
            );

            setScore(
                0
            );

            setPlayer(
                playerRef.current
            );

            setObstacles(
                []
            );
        },
        []
    );


    const finishGame = useCallback(
        () => {
            gameOverRef.current =
                true;

            startedRef.current =
                false;

            const finalScore =
                Math.floor(
                    scoreRef.current
                );

            if (
                finalScore >
                bestScoreRef.current
            ) {
                bestScoreRef.current =
                    finalScore;

                sessionStorage.setItem(
                    "novaos-dino-best-score",
                    String(
                        finalScore
                    )
                );

                setBestScore(
                    finalScore
                );
            }

            setGameOver(
                true
            );

            setStarted(
                false
            );
        },
        []
    );


    const jump = useCallback(
        () => {
            if (
                gameOverRef.current
            ) {
                resetGame();

                return;
            }

            if (
                !startedRef.current
            ) {
                startedRef.current =
                    true;

                setStarted(
                    true
                );
            }

            const current =
                playerRef.current;

            if (
                !current.jumping &&
                !current.ducking
            ) {
                current.velocityY =
                    -15.5;

                current.jumping =
                    true;

                setPlayer({
                    ...current
                });
            }
        },
        [
            resetGame
        ]
    );


    const setDuck =
        useCallback(
            (
                value
            ) => {
                if (
                    !startedRef.current ||
                    gameOverRef.current
                ) {
                    return;
                }

                const current =
                    playerRef.current;

                if (
                    !current.jumping
                ) {
                    current.ducking =
                        value;

                    current.height =
                        value
                            ? 34
                            : 54;

                    current.y =
                        value
                            ? GROUND_Y - 34
                            : GROUND_Y - 54;

                    setPlayer({
                        ...current
                    });
                }
            },
            []
        );


    useEffect(
        () => {
            const handleKeyDown =
                (
                    event
                ) => {
                    if (
                        event.code ===
                            "Space" ||
                        event.code ===
                            "ArrowUp"
                    ) {
                        event.preventDefault();

                        if (
                            !event.repeat
                        ) {
                            jump();
                        }
                    }

                    if (
                        event.code ===
                        "ArrowDown"
                    ) {
                        event.preventDefault();

                        setDuck(
                            true
                        );
                    }

                    if (
                        event.code ===
                            "Enter" &&
                        gameOverRef.current
                    ) {
                        event.preventDefault();

                        resetGame();
                    }
                };


            const handleKeyUp =
                (
                    event
                ) => {
                    if (
                        event.code ===
                        "ArrowDown"
                    ) {
                        event.preventDefault();

                        setDuck(
                            false
                        );
                    }
                };


            window.addEventListener(
                "keydown",
                handleKeyDown
            );

            window.addEventListener(
                "keyup",
                handleKeyUp
            );


            return () => {
                window.removeEventListener(
                    "keydown",
                    handleKeyDown
                );

                window.removeEventListener(
                    "keyup",
                    handleKeyUp
                );
            };
        },
        [
            jump,
            setDuck,
            resetGame
        ]
    );


    useEffect(
        () => {
            const updateSize =
                () => {
                    if (
                        !gameRef.current
                    ) {
                        return;
                    }

                    const rect =
                        gameRef.current.getBoundingClientRect();

                    setGameWidth(
                        Math.max(
                            320,
                            rect.width
                        )
                    );

                    setGameHeight(
                        Math.max(
                            220,
                            rect.height
                        )
                    );
                };


            updateSize();

            window.addEventListener(
                "resize",
                updateSize
            );


            return () => {
                window.removeEventListener(
                    "resize",
                    updateSize
                );
            };
        },
        []
    );


    useEffect(
        () => {
            if (
                !started
            ) {
                return undefined;
            }


            const loop =
                (
                    timestamp
                ) => {
                    if (
                        gameOverRef.current
                    ) {
                        return;
                    }


                    if (
                        !lastFrameRef.current
                    ) {
                        lastFrameRef.current =
                            timestamp;
                    }


                    const delta =
                        Math.min(
                            32,
                            timestamp -
                                lastFrameRef.current
                        );

                    lastFrameRef.current =
                        timestamp;


                    const frameScale =
                        delta /
                        16.67;


                    const elapsed =
                        scoreRef.current;


                    const difficulty =
                        clamp(
                            elapsed /
                                800,
                            0,
                            6
                        );


                    const currentPlayer =
                        playerRef.current;


                    /*
                     * =============================================
                     * DINO PHYSICS
                     * =============================================
                     *
                     * Positive velocity moves the Dino downward.
                     * Negative velocity moves it upward.
                     */

                    currentPlayer.velocityY +=
                        0.78 *
                        frameScale;

                    currentPlayer.y +=
                        currentPlayer.velocityY *
                        frameScale;


                    const ground =
                        GROUND_Y -
                        currentPlayer.height;


                    if (
                        currentPlayer.y >=
                        ground
                    ) {
                        currentPlayer.y =
                            ground;

                        currentPlayer.velocityY =
                            0;

                        currentPlayer.jumping =
                            false;
                    }


                    /*
                     * =============================================
                     * SCORE
                     * =============================================
                     */

                    scoreRef.current +=
                        0.08 *
                        frameScale;


                    const currentScore =
                        Math.floor(
                            scoreRef.current
                        );


                    if (
                        currentScore !==
                        renderedScoreRef.current
                    ) {
                        renderedScoreRef.current =
                            currentScore;

                        setScore(
                            currentScore
                        );
                    }


                    /*
                     * =============================================
                     * OBSTACLE SPAWNING
                     * =============================================
                     */

                    const shouldSpawn =
                        obstaclesRef.current
                            .length ===
                            0 ||
                        obstaclesRef.current
                            .every(
                                (
                                    obstacle
                                ) =>
                                    obstacle.x <
                                    gameWidth -
                                        220
                            );


                    if (
                        shouldSpawn &&
                        Math.random() <
                            0.018 *
                                frameScale
                    ) {
                        obstaclesRef.current.push(
                            createObstacle(
                                gameWidth,
                                difficulty
                            )
                        );
                    }


                    /*
                     * =============================================
                     * OBSTACLE MOVEMENT
                     * =============================================
                     */

                    obstaclesRef.current =
                        obstaclesRef.current
                            .map(
                                (
                                    obstacle
                                ) => ({
                                    ...obstacle,
                                    x:
                                        obstacle.x -
                                        (
                                            obstacle.speed +
                                            difficulty
                                        ) *
                                            frameScale
                                })
                            )
                            .filter(
                                (
                                    obstacle
                                ) =>
                                    obstacle.x +
                                        obstacle.width >
                                    -50
                            );


                    /*
                     * =============================================
                     * COLLISION BOX
                     * =============================================
                     *
                     * The hitbox is slightly smaller than the
                     * visible Dino so the game feels fair.
                     */

                    const playerLeft =
                        currentPlayer.x +
                        7;

                    const playerRight =
                        currentPlayer.x +
                        currentPlayer.width -
                        5;

                    const playerTop =
                        currentPlayer.y +
                        7;

                    const playerBottom =
                        currentPlayer.y +
                        currentPlayer.height -
                        2;


                    const collided =
                        obstaclesRef.current.some(
                            (
                                obstacle
                            ) => {
                                const obstacleLeft =
                                    obstacle.x +
                                    2;

                                const obstacleRight =
                                    obstacle.x +
                                    obstacle.width -
                                    2;

                                const obstacleTop =
                                    GROUND_Y -
                                    obstacle.height;

                                const obstacleBottom =
                                    GROUND_Y;


                                return (
                                    playerRight >
                                        obstacleLeft &&
                                    playerLeft <
                                        obstacleRight &&
                                    playerBottom >
                                        obstacleTop &&
                                    playerTop <
                                        obstacleBottom
                                );
                            }
                        );


                    /*
                     * =============================================
                     * RENDER STATE
                     * =============================================
                     */

                    setPlayer({
                        ...currentPlayer
                    });

                    setObstacles([
                        ...obstaclesRef.current
                    ]);


                    if (
                        collided
                    ) {
                        finishGame();

                        return;
                    }


                    animationRef.current =
                        requestAnimationFrame(
                            loop
                        );
                };


            animationRef.current =
                requestAnimationFrame(
                    loop
                );


            return () => {
                if (
                    animationRef.current
                ) {
                    cancelAnimationFrame(
                        animationRef.current
                    );
                }

                animationRef.current =
                    null;

                lastFrameRef.current =
                    0;
            };
        },
        [
            started,
            finishGame,
            gameWidth
        ]
    );


    useEffect(
        () => {
            return () => {
                if (
                    animationRef.current
                ) {
                    cancelAnimationFrame(
                        animationRef.current
                    );
                }
            };
        },
        []
    );


    const handleGameClick =
        () => {
            jump();
        };


    return (
        <div className="nova-offline-game-shell">
            <style>
                {`
                    .nova-offline-game-shell {
                        width: 100%;
                        min-height: 100%;
                        box-sizing: border-box;
                        padding: 28px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background:
                            radial-gradient(
                                circle at 50% 15%,
                                rgba(0, 190, 160, .07),
                                transparent 45%
                            ),
                            #080b12;
                        color: #f4f7fb;
                        overflow: auto;
                        font-family:
                            Inter,
                            ui-sans-serif,
                            system-ui,
                            -apple-system,
                            BlinkMacSystemFont,
                            "Segoe UI",
                            sans-serif;
                    }

                    .nova-offline-top {
                        width: min(
                            100%,
                            900px
                        );
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 20px;
                        margin-bottom: 20px;
                    }

                    .nova-offline-brand {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .nova-offline-brand-icon {
                        width: 38px;
                        height: 38px;
                        display: grid;
                        place-items: center;
                        border-radius: 11px;
                        background: rgba(0, 200, 170, .12);
                        border: 1px solid rgba(0, 220, 180, .28);
                        color: #16d5a8;
                    }

                    .nova-offline-brand-title {
                        font-size: 14px;
                        font-weight: 800;
                        letter-spacing: -.01em;
                    }

                    .nova-offline-brand-subtitle {
                        margin-top: 3px;
                        color: rgba(245, 247, 251, .46);
                        font-size: 10px;
                    }

                    .nova-offline-status {
                        display: inline-flex;
                        align-items: center;
                        gap: 7px;
                        padding: 7px 10px;
                        border-radius: 999px;
                        border: 1px solid rgba(255,255,255,.08);
                        background: rgba(255,255,255,.025);
                        color: rgba(245,247,251,.62);
                        font-size: 9px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: .06em;
                    }

                    .nova-offline-status-dot {
                        width: 6px;
                        height: 6px;
                        border-radius: 50%;
                        background: #ffb454;
                        box-shadow:
                            0 0 0 3px
                            rgba(255,180,84,.08);
                    }

                    .nova-offline-game-card {
                        width: min(
                            100%,
                            980px
                        );
                        border: 1px solid rgba(255,255,255,.09);
                        border-radius: 18px;
                        overflow: hidden;
                        background: rgba(11,15,24,.94);
                        box-shadow:
                            0 24px 80px
                            rgba(0,0,0,.35);
                    }

                    .nova-offline-game-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                        padding: 16px 18px;
                        border-bottom: 1px solid rgba(255,255,255,.07);
                    }

                    .nova-offline-game-title {
                        font-size: 13px;
                        font-weight: 800;
                    }

                    .nova-offline-game-meta {
                        display: flex;
                        align-items: center;
                        gap: 18px;
                        color: rgba(245,247,251,.48);
                        font-size: 10px;
                    }

                    .nova-offline-score {
                        color: #16d5a8;
                        font-family:
                            "SFMono-Regular",
                            Consolas,
                            monospace;
                        font-size: 12px;
                        font-weight: 800;
                    }

                    .nova-offline-game {
                        position: relative;
                        width: 100%;
                        height: 300px;
                        min-height: 260px;
                        overflow: hidden;
                        cursor: pointer;
                        user-select: none;
                        touch-action: manipulation;
                        background:
                            linear-gradient(
                                180deg,
                                rgba(17,24,38,.95),
                                rgba(8,11,18,.98)
                            );
                    }

                    .nova-offline-stars {
                        position: absolute;
                        inset: 0;
                        opacity: .42;
                        background-image:
                            radial-gradient(
                                circle,
                                rgba(255,255,255,.65) 1px,
                                transparent 1px
                            );
                        background-size: 110px 90px;
                        background-position:
                            20px 15px;
                    }

                    .nova-offline-horizon {
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: 61px;
                        height: 1px;
                        background:
                            rgba(255,255,255,.08);
                    }

                    .nova-offline-ground {
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: 60px;
                        height: 2px;
                        background:
                            rgba(22,213,168,.38);
                        box-shadow:
                            0 0 12px
                            rgba(22,213,168,.10);
                    }

                    .nova-offline-ground-detail {
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: 52px;
                        height: 3px;
                        opacity: .25;
                        background:
                            repeating-linear-gradient(
                                90deg,
                                rgba(255,255,255,.16) 0 30px,
                                transparent 30px 70px
                            );
                    }

                    /*
                     * The Dino is positioned by the actual physics
                     * coordinates supplied through inline styles.
                     * This makes the visible Dino follow its real
                     * jump trajectory.
                     */

                    .nova-dino {
                        position: absolute;
                        left: 10%;
                        bottom: 60px;
                        width: 42px;
                        height: 56px;
                        z-index: 5;
                        transform-origin: center bottom;
                        transition: none;
                        will-change:
                            left,
                            bottom,
                            transform;
                    }

                    .nova-dino.jumping {
                        transform:
                            translateY(0);
                    }

                    .nova-dino.ducking {
                        width: 52px;
                        height: 38px;
                    }

                    .nova-dino.game-over {
                        opacity: .65;
                    }

                    .nova-dino-head {
                        position: absolute;
                        top: 0;
                        right: 1px;
                        width: 30px;
                        height: 25px;
                        border-radius:
                            6px 7px 4px 4px;
                        background: #16d5a8;
                    }

                    .nova-dino-head::after {
                        content: "";
                        position: absolute;
                        right: -7px;
                        top: 11px;
                        width: 8px;
                        height: 5px;
                        border-radius: 2px;
                        background: #16d5a8;
                    }

                    .nova-dino-eye {
                        position: absolute;
                        right: 6px;
                        top: 6px;
                        width: 4px;
                        height: 4px;
                        border-radius: 50%;
                        background: #07100e;
                    }

                    .nova-dino-body {
                        position: absolute;
                        left: 6px;
                        top: 20px;
                        width: 25px;
                        height: 28px;
                        border-radius:
                            6px 5px 2px 2px;
                        background: #16d5a8;
                    }

                    .nova-dino-arm {
                        position: absolute;
                        width: 13px;
                        height: 5px;
                        border-radius: 4px;
                        background: #16d5a8;
                        top: 10px;
                    }

                    .nova-dino-arm-one {
                        left: -7px;
                        transform:
                            rotate(18deg);
                    }

                    .nova-dino-arm-two {
                        right: -8px;
                        transform:
                            rotate(-18deg);
                    }

                    .nova-dino-leg {
                        position: absolute;
                        bottom: 0;
                        width: 7px;
                        height: 16px;
                        border-radius:
                            0 0 4px 4px;
                        background: #16d5a8;
                    }

                    .nova-dino-leg-one {
                        left: 10px;
                    }

                    .nova-dino-leg-two {
                        left: 24px;
                    }

                    .nova-dino-tail {
                        position: absolute;
                        left: -1px;
                        top: 29px;
                        width: 13px;
                        height: 7px;
                        background: #16d5a8;
                        clip-path:
                            polygon(
                                100% 0,
                                0 0,
                                0 45%,
                                55% 100%
                            );
                    }

                    .nova-dino.ducking .nova-dino-head {
                        right: 0;
                        top: 4px;
                    }

                    .nova-dino.ducking .nova-dino-body {
                        top: 17px;
                        left: 4px;
                    }

                    .nova-dino.ducking .nova-dino-leg {
                        height: 9px;
                    }

                    .nova-dino.ducking .nova-dino-leg-two {
                        left: 27px;
                    }

                    .nova-offline-obstacle {
                        position: absolute;
                        bottom: 60px;
                        z-index: 4;
                        border-radius:
                            4px 4px 1px 1px;
                        background: #c4ccd8;
                        box-shadow:
                            0 0 0 1px
                            rgba(255,255,255,.08);
                    }

                    .nova-offline-obstacle::before,
                    .nova-offline-obstacle::after {
                        content: "";
                        position: absolute;
                        bottom: 10px;
                        width: 7px;
                        height: 24px;
                        border-radius: 3px;
                        background: #c4ccd8;
                    }

                    .nova-offline-obstacle::before {
                        left: -5px;
                    }

                    .nova-offline-obstacle::after {
                        right: -5px;
                        height: 18px;
                    }

                    .nova-offline-message {
                        position: absolute;
                        inset: 0;
                        z-index: 10;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        pointer-events: none;
                    }

                    .nova-offline-message-badge {
                        margin-bottom: 13px;
                        padding: 6px 9px;
                        border-radius: 999px;
                        background: rgba(22,213,168,.08);
                        border: 1px solid rgba(22,213,168,.18);
                        color: #16d5a8;
                        font-size: 9px;
                        font-weight: 900;
                        letter-spacing: .08em;
                        text-transform: uppercase;
                    }

                    .nova-offline-message h2 {
                        margin: 0 0 7px;
                        font-size: 19px;
                        font-weight: 800;
                    }

                    .nova-offline-message p {
                        margin: 0;
                        color: rgba(245,247,251,.52);
                        font-size: 11px;
                    }

                    .nova-offline-game.game-started
                        .nova-offline-message {
                        opacity: 0;
                    }

                    .nova-offline-game.game-over
                        .nova-offline-message {
                        opacity: 1;
                    }

                    .nova-offline-game.game-over
                        .nova-offline-message-badge {
                        color: #ffb454;
                        background:
                            rgba(255,180,84,.08);
                        border-color:
                            rgba(255,180,84,.18);
                    }

                    .nova-offline-controls {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 24px;
                        padding: 14px 18px;
                        border-top: 1px solid rgba(255,255,255,.07);
                        color: rgba(245,247,251,.42);
                        font-size: 10px;
                    }

                    .nova-offline-control {
                        display: inline-flex;
                        align-items: center;
                        gap: 7px;
                    }

                    .nova-offline-key {
                        min-width: 22px;
                        padding: 4px 6px;
                        text-align: center;
                        border: 1px solid rgba(255,255,255,.10);
                        border-radius: 5px;
                        background: rgba(255,255,255,.04);
                        color: rgba(245,247,251,.70);
                        font-family:
                            "SFMono-Regular",
                            Consolas,
                            monospace;
                        font-size: 9px;
                    }

                    .nova-offline-footer {
                        width: min(
                            100%,
                            900px
                        );
                        margin-top: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                        color: rgba(245,247,251,.32);
                        font-size: 9px;
                    }

                    .nova-offline-footer-status {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .nova-offline-footer-dot {
                        width: 5px;
                        height: 5px;
                        border-radius: 50%;
                        background: #16d5a8;
                    }

                    @media (max-width: 650px) {
                        .nova-offline-game-shell {
                            padding: 15px;
                        }

                        .nova-offline-top {
                            align-items: flex-start;
                            flex-direction: column;
                        }

                        .nova-offline-game {
                            height: 260px;
                        }

                        .nova-offline-controls {
                            flex-wrap: wrap;
                            gap: 12px;
                        }

                        .nova-offline-footer {
                            flex-direction: column;
                            align-items: flex-start;
                        }
                    }
                `}
            </style>


            <div className="nova-offline-top">
                <div className="nova-offline-brand">
                    <div className="nova-offline-brand-icon">
                        <NovaIcon
                            name="application"
                            size={18}
                        />
                    </div>

                    <div>
                        <div className="nova-offline-brand-title">
                            NovaOS Browser
                        </div>

                        <div className="nova-offline-brand-subtitle">
                            Offline mode
                        </div>
                    </div>
                </div>


                <div className="nova-offline-status">
                    <span className="nova-offline-status-dot" />
                    No internet connection
                </div>
            </div>


            <div className="nova-offline-game-card">
                <div className="nova-offline-game-header">
                    <div className="nova-offline-game-title">
                        NovaOS Offline Run
                    </div>

                    <div className="nova-offline-game-meta">
                        <span>
                            BEST
                        </span>

                        <span className="nova-offline-score">
                            {formatScore(
                                bestScore
                            )}
                        </span>

                        <span>
                            SCORE
                        </span>

                        <span className="nova-offline-score">
                            {formatScore(
                                score
                            )}
                        </span>
                    </div>
                </div>


                <div
                    ref={
                        gameRef
                    }
                    className={[
                        "nova-offline-game",
                        started
                            ? "game-started"
                            : "",
                        gameOver
                            ? "game-over"
                            : ""
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    onPointerDown={
                        handleGameClick
                    }
                    role="application"
                    aria-label="NovaOS offline dino game"
                >
                    <div className="nova-offline-stars" />


                    <div className="nova-offline-horizon" />

                    <div className="nova-offline-ground" />

                    <div className="nova-offline-ground-detail" />


                    {obstacles.map(
                        (
                            obstacle
                        ) => (
                            <div
                                key={
                                    obstacle.id
                                }
                                className="nova-offline-obstacle"
                                style={{
                                    left:
                                        `${(
                                            obstacle.x /
                                            gameWidth
                                        ) *
                                            100}%`,
                                    width:
                                        `${obstacle.width}px`,
                                    height:
                                        `${obstacle.height}px`
                                }}
                            />
                        )
                    )}


                    <DinoCharacter
                        jumping={
                            player.jumping
                        }
                        ducking={
                            player.ducking
                        }
                        gameOver={
                            gameOver
                        }
                        x={
                            player.x
                        }
                        y={
                            player.y
                        }
                        gameWidth={
                            gameWidth
                        }
                    />


                    <div className="nova-offline-message">
                        <div className="nova-offline-message-badge">
                            {gameOver
                                ? "Run ended"
                                : "Offline mode"}
                        </div>

                        <h2>
                            {gameOver
                                ? `Game Over — ${formatScore(
                                    score
                                )}`
                                : "Internet unavailable"}
                        </h2>

                        <p>
                            {gameOver
                                ? "Press Space or click to run again"
                                : "Press Space, ↑, or click to start"}
                        </p>
                    </div>
                </div>


                <div className="nova-offline-controls">
                    <span className="nova-offline-control">
                        <span className="nova-offline-key">
                            SPACE
                        </span>

                        Jump / Start
                    </span>

                    <span className="nova-offline-control">
                        <span className="nova-offline-key">
                            ↑
                        </span>

                        Jump
                    </span>

                    <span className="nova-offline-control">
                        <span className="nova-offline-key">
                            ↓
                        </span>

                        Duck
                    </span>

                    <span className="nova-offline-control">
                        <span className="nova-offline-key">
                            ENTER
                        </span>

                        Restart
                    </span>
                </div>
            </div>


            <div className="nova-offline-footer">
                <div className="nova-offline-footer-status">
                    <span className="nova-offline-footer-dot" />

                    <span>
                        Game runs entirely locally
                    </span>
                </div>

                <span>
                    NovaOS Browser • Offline experience
                </span>
            </div>
        </div>
    );
}


function Browser() {
    const [
        online,
        setOnline
    ] = useState(
        typeof navigator !==
            "undefined"
            ? navigator.onLine
            : true
    );

    const [
        url,
        setUrl
    ] = useState(
        ""
    );

    const [
        address,
        setAddress
    ] = useState(
        ""
    );


    useEffect(
        () => {
            const handleOnline =
                () => {
                    setOnline(
                        true
                    );
                };

            const handleOffline =
                () => {
                    setOnline(
                        false
                    );
                };


            window.addEventListener(
                "online",
                handleOnline
            );

            window.addEventListener(
                "offline",
                handleOffline
            );


            return () => {
                window.removeEventListener(
                    "online",
                    handleOnline
                );

                window.removeEventListener(
                    "offline",
                    handleOffline
                );
            };
        },
        []
    );


    const handleNavigate =
        (
            event
        ) => {
            event.preventDefault();

            const value =
                address.trim();

            if (!value) {
                return;
            }

            let target =
                value;

            if (
                !/^https?:\/\//i.test(
                    target
                )
            ) {
                target =
                    `https://${target}`;
            }

            setUrl(
                target
            );
        };


    if (
        !online
    ) {
        return (
            <OfflineDinoGame />
        );
    }


    return (
        <div
            className="nova-browser"
            style={{
                width: "100%",
                height: "100%",
                minHeight: "100%",
                display: "flex",
                flexDirection: "column",
                background:
                    "var(--nova-bg, #080b12)",
                color:
                    "var(--nova-text, #f4f7fb)",
                overflow: "hidden"
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding:
                        "9px 10px",
                    borderBottom:
                        "1px solid var(--nova-border, rgba(255,255,255,.08))",
                    background:
                        "rgba(255,255,255,.025)"
                }}
            >
                <button
                    type="button"
                    title="Back"
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border:
                            "1px solid rgba(255,255,255,.08)",
                        background:
                            "rgba(255,255,255,.035)",
                        color:
                            "inherit",
                        cursor:
                            "pointer"
                    }}
                    onClick={() => {
                        window.history.back();
                    }}
                >
                    ←
                </button>

                <button
                    type="button"
                    title="Forward"
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border:
                            "1px solid rgba(255,255,255,.08)",
                        background:
                            "rgba(255,255,255,.035)",
                        color:
                            "inherit",
                        cursor:
                            "pointer"
                    }}
                    onClick={() => {
                        window.history.forward();
                    }}
                >
                    →
                </button>

                <button
                    type="button"
                    title="Reload"
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border:
                            "1px solid rgba(255,255,255,.08)",
                        background:
                            "rgba(255,255,255,.035)",
                        color:
                            "inherit",
                        cursor:
                            "pointer"
                    }}
                    onClick={() => {
                        window.location.reload();
                    }}
                >
                    ↻
                </button>


                <form
                    onSubmit={
                        handleNavigate
                    }
                    style={{
                        flex: 1,
                        display:
                            "flex"
                    }}
                >
                    <input
                        value={
                            address
                        }
                        onChange={(
                            event
                        ) =>
                            setAddress(
                                event.target
                                    .value
                            )
                        }
                        placeholder="Search or enter website address"
                        aria-label="Browser address"
                        style={{
                            width:
                                "100%",
                            height:
                                32,
                            boxSizing:
                                "border-box",
                            borderRadius:
                                8,
                            border:
                                "1px solid rgba(255,255,255,.09)",
                            background:
                                "rgba(255,255,255,.035)",
                            color:
                                "inherit",
                            padding:
                                "0 11px",
                            outline:
                                "none",
                            font:
                                "inherit",
                            fontSize:
                                11
                        }}
                    />
                </form>


                <div
                    title="Internet connection"
                    style={{
                        display:
                            "grid",
                        placeItems:
                            "center",
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border:
                            "1px solid rgba(22,213,168,.20)",
                        background:
                            "rgba(22,213,168,.07)",
                        color:
                            "#16d5a8"
                    }}
                >
                    <NovaIcon
                        name="application"
                        size={14}
                    />
                </div>
            </div>


            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    position:
                        "relative",
                    background:
                        "#ffffff"
                }}
            >
                {url ? (
                    <iframe
                        title="NovaOS Browser"
                        src={
                            url
                        }
                        style={{
                            width:
                                "100%",
                            height:
                                "100%",
                            border:
                                0
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width:
                                "100%",
                            height:
                                "100%",
                            display:
                                "grid",
                            placeItems:
                                "center",
                            background:
                                "#ffffff",
                            color:
                                "#17202a"
                        }}
                    >
                        <div
                            style={{
                                textAlign:
                                    "center",
                                maxWidth:
                                    420,
                                padding:
                                    30
                            }}
                        >
                            <div
                                style={{
                                    width:
                                        56,
                                    height:
                                        56,
                                    margin:
                                        "0 auto 16px",
                                    display:
                                        "grid",
                                    placeItems:
                                        "center",
                                    borderRadius:
                                        16,
                                    background:
                                        "#e9f8f4",
                                    color:
                                        "#0aaf8b"
                                }}
                            >
                                <NovaIcon
                                    name="application"
                                    size={24}
                                />
                            </div>

                            <h2
                                style={{
                                    margin:
                                        0,
                                    fontSize:
                                        20
                                }}
                            >
                                NovaOS Browser
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "8px 0 0",
                                    color:
                                        "#66727e",
                                    fontSize:
                                        12,
                                    lineHeight:
                                        1.5
                                }}
                            >
                                Enter a website address
                                above to browse the
                                web.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


export default Browser;