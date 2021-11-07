window.ondragstart = function() { return false; }

function registerSwipe(q, radio) {
  console.log(q, radio);
  let container = document.querySelector(q);

  container.addEventListener("touchstart", startTouch, false);
  container.addEventListener("touchend", endTouch, false);
  container.addEventListener("mousedown", startMouse, false);
  container.addEventListener("mouseup", endMouse, false);

  let initialX = null;
  let initialY = null;


  function handleDiff(diffX, diffY) {
    if (Math.sqrt(diffX * diffX + diffY * diffY) < 100) {
      return;
    }
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        console.log("swiped left");
      } else {
        console.log("swiped right");
      }
      document.querySelector(radio).checked = true;
    }
  }

  function startTouch(e) {
    initialX = e.touches[0].clientX;
    initialY = e.touches[0].clientY;
  }

  function endTouch(e) {
    if (initialX === null) {
      return;
    }

    if (initialY === null) {
      return;
    }

    let currentX = e.touches[0].clientX;
    let currentY = e.touches[0].clientY;

    let diffX = initialX - currentX;
    let diffY = initialY - currentY;

    handleDiff(diffX, diffY);

    initialX = null;
    initialY = null;

    e.preventDefault();
  }

  function startMouse(e) {
    initialX = e.clientX;
    initialY = e.clientY;
  }

  function endMouse(e) {
    if (initialX === null) {
      return;
    }

    if (initialY === null) {
      return;
    }

    let currentX = e.clientX;
    let currentY = e.clientY;

    let diffX = initialX - currentX;
    let diffY = initialY - currentY;

    handleDiff(diffX, diffY);

    initialX = null;
    initialY = null;

    e.preventDefault();
  }
}

window.onload = () => {
  for (let i = 1; i <= 7; i++) {
    registerSwipe('#pic' + i, '#pig' + (i % 7 + 1));
  }
}
