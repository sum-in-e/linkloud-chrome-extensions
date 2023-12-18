const BASE_URL = "https://api.linkloud.xyz";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // * 로그인 확인
  if (request.action === "checkLogin") {
    const checkLogin = async () => {
      let isLoggedIn = false;

      const getCookie = (name) =>
        new Promise((resolve) =>
          chrome.cookies.get({ url: "https://linkloud.xyz/", name }, (cookie) =>
            resolve(cookie ? cookie.value : null)
          )
        );

      const accessToken = await getCookie("sq");
      const refreshToken = await getCookie("bp");

      if (accessToken || refreshToken) {
        try {
          const response = await fetch(`${BASE_URL}/user/me`, {
            method: "GET",
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Need login");
          }

          isLoggedIn = true;
        } catch (error) {
          // handle error
        }
      }

      return isLoggedIn;
    };

    checkLogin().then((isLoggedIn) => sendResponse({ isLoggedIn }));

    return true; // 함수 마지막에 명시적으로 적어주어야 response를 받아야하는 곳에서 비동기로 콜백함수를 호출할 수 있다.
  }

  // * 링크 정보 가져오기
  if (request.action === "analyzeLink") {
    const currentTabUrl = request.url;

    const analyzeLink = async () => {
      const response = await fetch(
        `${BASE_URL}/link/analyze?url=${currentTabUrl}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const errorMessage =
          response.status === 400
            ? "유효하지 않은 링크입니다. 다른 링크를 저장해 보세요!"
            : "에러로 인해 데이터를 불러오지 못했습니다.\n다시 시도해 주세요.";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    };

    analyzeLink()
      .then((data) => {
        sendResponse({ data: data.data, error: null });
      })
      .catch((error) => {
        sendResponse({ data: null, error: error.message });
      });

    return true;
  }

  // * 클라우드 리스트 가져오기
  if (request.action === "getKloudList") {
    const getKloudList = async () => {
      const response = await fetch(`${BASE_URL}/kloud/list`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          "서버 에러로 클라우드 리스트를 불러오지 못했습니다.\n다시 시도해 주세요."
        );
      }

      const data = await response.json();
      return data;
    };

    getKloudList()
      .then((data) => {
        const kloudsData = data.data;

        kloudsData.klouds.unshift({ id: null, name: "미분류" }); // 맨 앞에 '미분류' 클라우드 추가
        sendResponse({ data: kloudsData, error: null });
      })
      .catch((error) => {
        sendResponse({ data: null, error: error.message });
      });

    return true;
  }

  // * 클라우드 생성하기
  if (request.action === "createKloud") {
    const { name } = request;

    const createKloud = async () => {
      const response = await fetch(`${BASE_URL}/kloud`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorMessage =
          response.status === 400
            ? "유저당 최대 20개의 클라우드까지 생성 가능합니다."
            : "서버 에러로 클라우드를 생성하지 못했습니다.\n다시 시도해 주세요.";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    };

    createKloud()
      .then((data) => {
        sendResponse({ data: data.data, error: null });
      })
      .catch((error) => {
        sendResponse({ data: null, error: error.message });
      });

    return true;
  }

  // * 링크 추가하기
  if (request.action === "createLink") {
    const { url, title, description, thumbnailUrl, isFollowing, kloudId } =
      request;

    const createLink = async () => {
      const response = await fetch(`${BASE_URL}/link`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          title,
          description,
          thumbnailUrl,
          isFollowing,
          kloudId,
        }),
      });

      if (!response.ok) {
        const errorMessage =
          response.status === 404
            ? "선택한 클라우드를 찾을 수 없습니다.\n다시 시도해 주세요."
            : "서버 에러로 인해 링크를 저장하지 못했습니다.\n다시 시도해 주세요";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    };

    createLink()
      .then((data) => {
        sendResponse({ data: data.data, error: null });
      })
      .catch((error) => {
        sendResponse({ data: null, error: error.message });
      });

    return true;
  }

  // * 링크 추가 성공 시 뱃지 띄워주기
  if (request.action === "showBadge") {
    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#000dff" });

    // 3초 후 성공 표시 뱃지 제거
    setTimeout(function () {
      chrome.action.setBadgeText({ text: "" });
    }, 3000);
  }
});
