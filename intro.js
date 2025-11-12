
function initIntro(onComplete) {
    const introScreen = document.getElementById('intro-screen');
    const skipBtn = document.getElementById('skip-intro');
    let introEnded = false;

    function endIntro() {
        if (introEnded) return;
        introEnded = true;
        introScreen.style.transition = 'opacity 1s';
        introScreen.style.opacity = '0';
        setTimeout(() => {
            introScreen.style.display = 'none';
            if (onComplete) {
                onComplete();
            }
        }, 1000);
    }

    // Automatic end of scroll
    setTimeout(endIntro, 51000); // Corresponds to the animation durations

    // Skip intro functionality
    skipBtn.addEventListener('click', endIntro);
}
