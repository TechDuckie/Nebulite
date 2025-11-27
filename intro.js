
function initIntro(onComplete, onUnlockAudio) {
    const introScreen = document.getElementById('intro-screen');
    const skipBtn = document.getElementById('skip-intro');
    const continueBtn = document.getElementById('continue-intro');
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

    function onInteraction() {
        if (onUnlockAudio) {
            onUnlockAudio();
        }
        endIntro();
    }

    // Automatic end of scroll
    setTimeout(() => {
        skipBtn.style.display = 'none';
        continueBtn.style.display = 'block';
    }, 51000); // Corresponds to the animation durations

    // Skip intro functionality
    skipBtn.addEventListener('click', onInteraction);
    continueBtn.addEventListener('click', onInteraction);
}
