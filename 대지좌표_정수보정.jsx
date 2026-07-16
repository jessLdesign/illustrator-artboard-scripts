// 대지좌표_정수보정.jsx
// 모든 대지(Artboard)의 좌표를 정수(px/pt)로 강제 보정하여
// Export 시 발생하는 "1px 더 크게 나오는" 버그를 예방하는 스크립트.
// 대지 좌표만 반올림하면 그 안의 그림이 상대적으로 어긋나 보이므로,
// 대지가 이동한 만큼 그 대지에 속한 오브젝트도 함께 이동시켜 정렬을 유지합니다.

#target illustrator

function findItemsOnArtboard(doc, rect) {
    // rect = [left, top, right, bottom]. 이 영역 안에 중심점이 있는
    // "최상위" 오브젝트만 골라낸다 (그룹 내부의 하위 오브젝트는 제외 -
    // 상위 그룹을 이동시키면 하위 오브젝트는 같이 딸려서 이동하기 때문).
    var L = rect[0], T = rect[1], R = rect[2], B = rect[3];
    var found = [];
    for (var i = 0; i < doc.pageItems.length; i++) {
        var item = doc.pageItems[i];
        try {
            if (item.parent.typename !== "Layer") continue; // 그룹 내부 하위 아이템은 건너뜀
        } catch (e) {
            continue;
        }
        var b;
        try {
            b = item.geometricBounds; // [l,t,r,b]
        } catch (e) {
            continue;
        }
        var cx = (b[0] + b[2]) / 2;
        var cy = (b[1] + b[3]) / 2;
        if (cx >= L && cx <= R && cy <= T && cy >= B) {
            found.push(item);
        }
    }
    return found;
}

function roundToGrain(v, grain) {
    return Math.round(v / grain) * grain;
}

function roundArtboardCoords() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다. 일러스트레이터 파일을 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var artboards = doc.artboards;
    var total = artboards.length;
    var fixedCount = 0;
    var movedItemCount = 0;
    var detailLog = [];

    var rulerUnits = "알 수 없음";
    try {
        rulerUnits = String(doc.rulerUnits);
    } catch (e) {}

    // 문서에 배율(Scale Factor)이 걸려있으면, 내부 좌표(pt)와 화면 표시 숫자가
    // 배율만큼 차이난다. 이 경우 "화면에 보이는 정수 단위" 기준으로 반올림해야
    // 하므로, 반올림 단위(grain)를 배율의 역수로 잡는다.
    var scaleFactor = 1;
    try {
        if (doc.scaleFactor && doc.scaleFactor > 0) {
            scaleFactor = doc.scaleFactor;
        }
    } catch (e) {
        // scaleFactor 속성이 없는 버전/문서 - 배율 없음(1)으로 간주
    }
    var grain = 1 / scaleFactor;

    for (var i = 0; i < total; i++) {
        var ab = artboards[i];
        var rect = ab.artboardRect; // [left, top, right, bottom] (내부 pt 단위)
        var L = rect[0], T = rect[1], R = rect[2], B = rect[3];
        var origW = R - L;
        var origH = T - B;

        var newL = roundToGrain(L, grain);
        var newT = roundToGrain(T, grain);
        var w = roundToGrain(origW, grain);
        var h = roundToGrain(origH, grain);
        var newR = newL + w;
        var newB = newT - h;

        var dx = newL - L;
        var dy = newT - T;

        detailLog.push(
            ab.name + " : 원래 " + origW.toFixed(4) + " x " + origH.toFixed(4) +
            " (pt, 화면상 " + (origW*scaleFactor).toFixed(2) + " x " + (origH*scaleFactor).toFixed(2) + ")" +
            "  ->  보정 후 화면상 " + (w*scaleFactor).toFixed(2) + " x " + (h*scaleFactor).toFixed(2) +
            "  [dx=" + dx.toFixed(4) + ", dy=" + dy.toFixed(4) + "]"
        );

        if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
            continue;
        }

        var items = findItemsOnArtboard(doc, rect);
        for (var k = 0; k < items.length; k++) {
            try {
                items[k].translate(dx, dy);
                movedItemCount++;
            } catch (e) {}
        }

        ab.artboardRect = [newL, newT, newR, newB];
        fixedCount++;
    }

    var msg = "문서 눈금자 단위: " + rulerUnits + "\n";
    msg += "감지된 배율(Scale Factor): 1 : " + scaleFactor + "\n";
    msg += "총 " + total + "개 대지 중 " + fixedCount + "개 대지의 좌표를 보정했습니다.\n";
    msg += "대지와 함께 " + movedItemCount + "개 오브젝트를 같이 이동시켰습니다.\n\n";
    msg += "--- 대지별 상세 ---\n";
    msg += detailLog.join("\n");

    alert(msg);
}

roundArtboardCoords();
