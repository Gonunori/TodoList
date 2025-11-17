// minimum 함수는 주어진 배열 arr에서 가장 작은 값을 찾아 반환합니다.
// 만약 arr가 배열이 아니거나 빈 배열이면, 에러를 발생시킵니다.
function minimum(arr) {
    // arr가 배열이 아니거나, 길이가 0이면 예외를 발생시킵니다.
    if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error('유효한 숫자 배열을 입력하세요.');
    }
    // 배열의 첫 번째 값을 min 변수에 초기화합니다.
    let min = arr[0];
    // 배열의 두 번째 요소부터 끝까지 반복하면서
    for (let i = 1; i < arr.length; i++) {
        // 만약 현재 값이 min보다 작으면, min을 현재 값으로 갱신합니다.
        if (arr[i] < min) {
            min = arr[i];
        }
    }
    // 가장 작은 값을 반환합니다.
    return min;
}
console.log(minimum([1, 2, 3, 4, 5]));
console.log(minimum([5, 4, 3, 2, 1]));
console.log(minimum([1, 1, 1, 1, 1]));
console.log(minimum([1, 2, 3, 4, 5]));
console.log(minimum([5, 4, 3, 2, 1]));
console.log(minimum([1, 1, 1, 1, 1]));
console.log(minimum([1, 2, 3, 4, 5]));
console.log(minimum([5, 4, 3, 2, 1]));
console.log(minimum([1, 1, 1, 1, 1]));
// 다양한 테스트 케이스 추가

// 음수와 0 포함
console.log(minimum([-1, 0, 1, 2, 3])); // -1

// 큰 수, 작은 수 섞기
console.log(minimum([100, -100, 0, 50, -50])); // -100

// 한 개만 있는 경우
console.log(minimum([42])); // 42

// 모두 같은 음수
console.log(minimum([-5, -5, -5, -5])); // -5

// 소수 포함
console.log(minimum([1.1, 2.2, 3.3, 0.5])); // 0.5

// Infinity, -Infinity, NaN 포함
console.log(minimum([Infinity, -Infinity, 1, 2])); // -Infinity

// NaN 포함
try {
    console.log(minimum([1, 2, NaN]));
} catch (e) {
    console.log(e.message); // 예외 예상
}

// 빈 배열
try {
    console.log(minimum([]));
} catch (e) {
    console.log(e.message); // 예외 예상
}

// 숫자가 아닌 값 포함
try {
    console.log(minimum([1, "a", 3]));
} catch (e) {
    console.log(e.message); // 숫자가 아닌 값에 대한 동작 확인
}

// 배열이 아닌 값 전달
try {
    console.log(minimum("not array"));
} catch (e) {
    console.log(e.message); // 예외 예상
}

