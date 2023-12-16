// 로딩 Elements
const loadingSection = document.getElementById("loading-section");

// 에러 Elements
const errorSection = document.getElementById("error-section");
const errorText = document.getElementById("error-text");

// 로그인 Elements
const needLoginSection = document.getElementById("need-login-section");
const loginButton = document.getElementById("login-button");

// 링크 인포 Elements
const linkInfoSection = document.getElementById("link-info-section");
const linkImage = document.getElementById("link-image");
const linkURL = document.getElementById("link-url");
const linkTitle = document.getElementById("link-title");
const linkDescription = document.getElementById("link-description");
const selecteKloudText = document.getElementById("selected-kloud-text");
const kloudSelector = document.getElementById("kloud-selector");
const saveButton = document.getElementById("save-button");

// 클라우드 리스트 Elements
const kloudListSection = document.getElementById("kloud-list-section");
const kloudInput = document.getElementById("kloud-input");
const kloudInputError = document.getElementById("kloud-input-error");
const kloudList = document.getElementById("kloud-list");
const closeButton = document.getElementById("close-button");
const kloudTitleWithCount = document.getElementById("kloud-title-with-count");

let kloudId = null;
let kloudText = "미분류";

/**
 * 로그인 확인
 */
chrome.runtime.sendMessage({ action: "checkLogin" }, function (response) {
  const isLoggedIn = response.isLoggedIn;

  if (isLoggedIn) {
    // 로딩 UI 보여주기
    loadingSection.style.display = "flex";

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTabUrl = tabs[0].url;

      chrome.runtime.sendMessage(
        { action: "analyzeLink", url: currentTabUrl },
        function (response) {
          // 로딩 UI 제거
          loadingSection.style.display = "none";

          if (response.error) {
            errorText.innerText = response.error;
            errorSection.style.display = "flex";
          } else {
            const { url, title, thumbnailUrl, description } = response.data;

            linkImage.src = thumbnailUrl;
            linkURL.innerText = url;
            linkTitle.value = title;
            linkDescription.value = description;
            selecteKloudText.innerText = kloudText;

            linkInfoSection.style.display = "flex";
          }
        }
      );
    });
  } else {
    // 로그인 필요 UI 보여주기
    needLoginSection.style.display = "flex";
  }
});

/**
 * 로그인 버튼 클릭 이벤트
 */
loginButton.addEventListener("click", function () {
  chrome.tabs.create({
    url: `https://linkloud.xyz/login?return_to=/chrome-extensions`,
  });
});

/**
 * 클라우드 버튼 클릭 이벤트
 * (클라우드 리스트 진입)
 */
kloudSelector.addEventListener("click", function () {
  // 로딩 UI 보여주기
  linkInfoSection.style.display = "none";
  loadingSection.style.display = "flex";

  // 기존 값들 초기화
  kloudInput.value = "";
  kloudInputError.innerText = "";
  while (kloudList.firstChild) {
    kloudList.removeChild(kloudList.firstChild);
  }

  chrome.runtime.sendMessage({ action: "getKloudList" }, function (response) {
    loadingSection.style.display = "none"; // 로딩 UI 제거

    if (response.error) {
      errorText.innerText = response.error;
      errorSection.style.display = "flex";
    } else {
      const { count, klouds } = response.data;

      kloudTitleWithCount.innerText = `클라우드 (${count})`;

      klouds.forEach((kloud) => {
        const kloudItem = document.createElement("li");
        const itemName = document.createElement("p");

        kloudItem.id = "kloud-item";
        itemName.id = "kloud-item-name";
        itemName.innerText = kloud.name;
        kloudItem.appendChild(itemName);

        if (kloud.id !== null) {
          // 미분류 아닐 경우에만 count element 추가
          const itemCount = document.createElement("p");
          itemCount.innerText = kloud.linkCount;
          kloudItem.appendChild(itemCount);
        }

        if (kloud.id === kloudId) {
          kloudItem.className = "selected-kloud";
        }

        kloudItem.addEventListener("click", () => {
          kloudId = kloud.id;
          kloudText = kloud.name;
          selecteKloudText.innerText = kloudText;
          kloudListSection.style.display = "none";
          linkInfoSection.style.display = "flex";
        });
        kloudList.appendChild(kloudItem);
      });

      kloudListSection.style.display = "flex";
    }
  });
});

/**
 * 클라우드 추가 인풋 제출 이벤트
 */
kloudInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    const kloudName = kloudInput.value;

    if (kloudName.length > 50) {
      kloudInputError.innerText = "클라우드 이름은 50자 이내로 작성해 주세요";
      return;
    }

    kloudInputError.innerText = ""; // 에러 메시지 초기화

    chrome.runtime.sendMessage(
      { action: "createKloud", name: kloudName },
      function (response) {
        if (response.error) {
          kloudInputError.innerText = response.error;
        } else {
          const { id, name } = response.data;

          kloudId = id;
          kloudText = name;
          selecteKloudText.innerText = kloudText;
          kloudListSection.style.display = "none";
          linkInfoSection.style.display = "flex";
        }
      }
    );
  }
});

/**
 * 클라우드 리스트 닫기 이벤트
 */
closeButton.addEventListener("click", function () {
  kloudListSection.style.display = "none";
  linkInfoSection.style.display = "flex";
});

/**
 * 링크 제목 인풋 이벤트
 * 링크 제목이 없는 경우 링크 추가가 불가하도록 하기 위한 이벤트 함수입니다.
 */
linkTitle.addEventListener("input", function () {
  if (linkTitle.value.trim() !== "") {
    saveButton.disabled = false;
  } else {
    saveButton.disabled = true;
  }
});

/**
 * 링크 추가 이벤트
 */
saveButton.addEventListener("click", function () {
  const linkData = {
    thumbnailUrl: linkImage.src,
    url: linkURL.innerText,
    title: linkTitle.value,
    description: linkDescription.value,
    kloudId,
  };

  chrome.runtime.sendMessage(
    { action: "createLink", ...linkData },
    function (response) {
      if (response.error) {
        alert(response.error);
      } else {
        chrome.runtime.sendMessage(
          { action: "showBadge" },
          function (response) {
            window.close();
          }
        );
      }
    }
  );
});
