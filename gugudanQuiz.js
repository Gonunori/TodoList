// 임의의 구구단 문제를 출제해서 사용자의 정답 입력을 받고, 정답인지 오답인지 알려주는 코드입니다.

function gugudanQuiz() {
    // 2~9 사이의 임의의 단
    const dan = Math.floor(Math.random() * 8) + 2;
    // 1~9 사이의 임의의 곱해질 값
    const n = Math.floor(Math.random() * 9) + 1;

    // 노드 환경에서도 사용 가능하게 prompt 대신 readline 사용
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`${dan} x ${n} = ?\n정답을 입력하세요: `, (answer) => {
        const userAnswer = parseInt(answer, 10);
        const correctAnswer = dan * n;
        if (userAnswer === correctAnswer) {
            console.log('정답입니다!');
        } else {
            console.log(`오답입니다. 정답은 ${correctAnswer}입니다.`);
        }
        readline.close();
    });
}

// 예시 실행
gugudanQuiz();
