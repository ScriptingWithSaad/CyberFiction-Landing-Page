function locomotive() {
    gsap.registerPlugin(ScrollTrigger);

    const locoScroll = new LocomotiveScroll({
        el: document.querySelector("#main"),
        smooth: true,
    });

    locoScroll.on("scroll", ScrollTrigger.update);

    ScrollTrigger.scrollerProxy("#main", {
        scrollTop(value) {
            return arguments.length
                ? locoScroll.scrollTo(value, 0, 0)
                : locoScroll.scroll.instance.scroll.y;
        },
        getBoundingClientRect() {
            return {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
            };
        },
        pinType: document.querySelector("#main").style.transform
            ? "transform"
            : "fixed",
    });

    ScrollTrigger.addEventListener("refresh", () => locoScroll.update());
    ScrollTrigger.refresh();
}
locomotive();

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
});

function files(index) {
    const data = `
       ../assets/images/male0001.png
/CyberFiction-Landing-Page/assets/images/male0002.png
/CyberFiction-Landing-Page/assets/images/male0003.png
/CyberFiction-Landing-Page/assets/images/male0004.png
/CyberFiction-Landing-Page/assets/images/male0005.png
/CyberFiction-Landing-Page/assets/images/male0006.png
/CyberFiction-Landing-Page/assets/images/male0007.png
/CyberFiction-Landing-Page/assets/images/male0008.png
/CyberFiction-Landing-Page/assets/images/male0009.png
/CyberFiction-Landing-Page/assets/images/male0010.png
/CyberFiction-Landing-Page/assets/images/male0011.png
/CyberFiction-Landing-Page/assets/images/male0012.png
/CyberFiction-Landing-Page/assets/images/male0013.png
/CyberFiction-Landing-Page/assets/images/male0014.png
/CyberFiction-Landing-Page/assets/images/male0015.png
/CyberFiction-Landing-Page/assets/images/male0016.png
/CyberFiction-Landing-Page/assets/images/male0017.png
/CyberFiction-Landing-Page/assets/images/male0018.png
/CyberFiction-Landing-Page/assets/images/male0019.png
/CyberFiction-Landing-Page/assets/images/male0020.png
/CyberFiction-Landing-Page/assets/images/male0021.png
/CyberFiction-Landing-Page/assets/images/male0022.png
/CyberFiction-Landing-Page/assets/images/male0023.png
/CyberFiction-Landing-Page/assets/images/male0024.png
/CyberFiction-Landing-Page/assets/images/male0025.png
/CyberFiction-Landing-Page/assets/images/male0026.png
/CyberFiction-Landing-Page/assets/images/male0027.png
/CyberFiction-Landing-Page/assets/images/male0028.png
/CyberFiction-Landing-Page/assets/images/male0029.png
/CyberFiction-Landing-Page/assets/images/male0030.png
/CyberFiction-Landing-Page/assets/images/male0031.png
/CyberFiction-Landing-Page/assets/images/male0032.png
/CyberFiction-Landing-Page/assets/images/male0033.png
/CyberFiction-Landing-Page/assets/images/male0034.png
/CyberFiction-Landing-Page/assets/images/male0035.png
/CyberFiction-Landing-Page/assets/images/male0036.png
/CyberFiction-Landing-Page/assets/images/male0037.png
/CyberFiction-Landing-Page/assets/images/male0038.png
/CyberFiction-Landing-Page/assets/images/male0039.png
/CyberFiction-Landing-Page/assets/images/male0040.png
/CyberFiction-Landing-Page/assets/images/male0041.png
/CyberFiction-Landing-Page/assets/images/male0042.png
/CyberFiction-Landing-Page/assets/images/male0043.png
/CyberFiction-Landing-Page/assets/images/male0044.png
/CyberFiction-Landing-Page/assets/images/male0045.png
/CyberFiction-Landing-Page/assets/images/male0046.png
/CyberFiction-Landing-Page/assets/images/male0047.png
/CyberFiction-Landing-Page/assets/images/male0048.png
/CyberFiction-Landing-Page/assets/images/male0049.png
/CyberFiction-Landing-Page/assets/images/male0050.png
/CyberFiction-Landing-Page/assets/images/male0051.png
/CyberFiction-Landing-Page/assets/images/male0052.png
/CyberFiction-Landing-Page/assets/images/male0053.png
/CyberFiction-Landing-Page/assets/images/male0054.png
/CyberFiction-Landing-Page/assets/images/male0055.png
/CyberFiction-Landing-Page/assets/images/male0056.png
/CyberFiction-Landing-Page/assets/images/male0057.png
/CyberFiction-Landing-Page/assets/images/male0058.png
/CyberFiction-Landing-Page/assets/images/male0059.png
/CyberFiction-Landing-Page/assets/images/male0060.png
/CyberFiction-Landing-Page/assets/images/male0061.png
/CyberFiction-Landing-Page/assets/images/male0062.png
/CyberFiction-Landing-Page/assets/images/male0063.png
/CyberFiction-Landing-Page/assets/images/male0064.png
/CyberFiction-Landing-Page/assets/images/male0065.png
/CyberFiction-Landing-Page/assets/images/male0066.png
/CyberFiction-Landing-Page/assets/images/male0067.png
/CyberFiction-Landing-Page/assets/images/male0068.png
/CyberFiction-Landing-Page/assets/images/male0069.png
/CyberFiction-Landing-Page/assets/images/male0070.png
/CyberFiction-Landing-Page/assets/images/male0071.png
/CyberFiction-Landing-Page/assets/images/male0072.png
/CyberFiction-Landing-Page/assets/images/male0073.png
/CyberFiction-Landing-Page/assets/images/male0074.png
/CyberFiction-Landing-Page/assets/images/male0075.png
/CyberFiction-Landing-Page/assets/images/male0076.png
/CyberFiction-Landing-Page/assets/images/male0077.png
/CyberFiction-Landing-Page/assets/images/male0078.png
/CyberFiction-Landing-Page/assets/images/male0079.png
/CyberFiction-Landing-Page/assets/images/male0080.png
/CyberFiction-Landing-Page/assets/images/male0081.png
/CyberFiction-Landing-Page/assets/images/male0082.png
/CyberFiction-Landing-Page/assets/images/male0083.png
/CyberFiction-Landing-Page/assets/images/male0084.png
/CyberFiction-Landing-Page/assets/images/male0085.png
/CyberFiction-Landing-Page/assets/images/male0086.png
/CyberFiction-Landing-Page/assets/images/male0087.png
/CyberFiction-Landing-Page/assets/images/male0088.png
/CyberFiction-Landing-Page/assets/images/male0089.png
/CyberFiction-Landing-Page/assets/images/male0090.png
/CyberFiction-Landing-Page/assets/images/male0091.png
/CyberFiction-Landing-Page/assets/images/male0092.png
/CyberFiction-Landing-Page/assets/images/male0093.png
/CyberFiction-Landing-Page/assets/images/male0094.png
/CyberFiction-Landing-Page/assets/images/male0095.png
/CyberFiction-Landing-Page/assets/images/male0096.png
/CyberFiction-Landing-Page/assets/images/male0097.png
/CyberFiction-Landing-Page/assets/images/male0098.png
/CyberFiction-Landing-Page/assets/images/male0099.png
/CyberFiction-Landing-Page/assets/images/male0100.png
/CyberFiction-Landing-Page/assets/images/male0101.png
/CyberFiction-Landing-Page/assets/images/male0102.png
/CyberFiction-Landing-Page/assets/images/male0103.png
/CyberFiction-Landing-Page/assets/images/male0104.png
/CyberFiction-Landing-Page/assets/images/male0105.png
/CyberFiction-Landing-Page/assets/images/male0106.png
/CyberFiction-Landing-Page/assets/images/male0107.png
/CyberFiction-Landing-Page/assets/images/male0108.png
/CyberFiction-Landing-Page/assets/images/male0109.png
/CyberFiction-Landing-Page/assets/images/male0110.png
/CyberFiction-Landing-Page/assets/images/male0111.png
/CyberFiction-Landing-Page/assets/images/male0112.png
/CyberFiction-Landing-Page/assets/images/male0113.png
/CyberFiction-Landing-Page/assets/images/male0114.png
/CyberFiction-Landing-Page/assets/images/male0115.png
/CyberFiction-Landing-Page/assets/images/male0116.png
/CyberFiction-Landing-Page/assets/images/male0117.png
/CyberFiction-Landing-Page/assets/images/male0118.png
/CyberFiction-Landing-Page/assets/images/male0119.png
/CyberFiction-Landing-Page/assets/images/male0120.png
/CyberFiction-Landing-Page/assets/images/male0121.png
/CyberFiction-Landing-Page/assets/images/male0122.png
/CyberFiction-Landing-Page/assets/images/male0123.png
/CyberFiction-Landing-Page/assets/images/male0124.png
/CyberFiction-Landing-Page/assets/images/male0125.png
/CyberFiction-Landing-Page/assets/images/male0126.png
/CyberFiction-Landing-Page/assets/images/male0127.png
/CyberFiction-Landing-Page/assets/images/male0128.png
/CyberFiction-Landing-Page/assets/images/male0129.png
/CyberFiction-Landing-Page/assets/images/male0130.png
/CyberFiction-Landing-Page/assets/images/male0131.png
/CyberFiction-Landing-Page/assets/images/male0132.png
/CyberFiction-Landing-Page/assets/images/male0133.png
/CyberFiction-Landing-Page/assets/images/male0134.png
/CyberFiction-Landing-Page/assets/images/male0135.png
/CyberFiction-Landing-Page/assets/images/male0136.png
/CyberFiction-Landing-Page/assets/images/male0137.png
/CyberFiction-Landing-Page/assets/images/male0138.png
/CyberFiction-Landing-Page/assets/images/male0139.png
/CyberFiction-Landing-Page/assets/images/male0140.png
/CyberFiction-Landing-Page/assets/images/male0141.png
/CyberFiction-Landing-Page/assets/images/male0142.png
/CyberFiction-Landing-Page/assets/images/male0143.png
/CyberFiction-Landing-Page/assets/images/male0144.png
/CyberFiction-Landing-Page/assets/images/male0145.png
/CyberFiction-Landing-Page/assets/images/male0146.png
/CyberFiction-Landing-Page/assets/images/male0147.png
/CyberFiction-Landing-Page/assets/images/male0148.png
/CyberFiction-Landing-Page/assets/images/male0149.png
/CyberFiction-Landing-Page/assets/images/male0150.png
/CyberFiction-Landing-Page/assets/images/male0151.png
/CyberFiction-Landing-Page/assets/images/male0152.png
/CyberFiction-Landing-Page/assets/images/male0153.png
/CyberFiction-Landing-Page/assets/images/male0154.png
/CyberFiction-Landing-Page/assets/images/male0155.png
/CyberFiction-Landing-Page/assets/images/male0156.png
/CyberFiction-Landing-Page/assets/images/male0157.png
/CyberFiction-Landing-Page/assets/images/male0158.png
/CyberFiction-Landing-Page/assets/images/male0159.png
/CyberFiction-Landing-Page/assets/images/male0160.png
/CyberFiction-Landing-Page/assets/images/male0161.png
/CyberFiction-Landing-Page/assets/images/male0162.png
/CyberFiction-Landing-Page/assets/images/male0163.png
/CyberFiction-Landing-Page/assets/images/male0164.png
/CyberFiction-Landing-Page/assets/images/male0165.png
/CyberFiction-Landing-Page/assets/images/male0166.png
/CyberFiction-Landing-Page/assets/images/male0167.png
/CyberFiction-Landing-Page/assets/images/male0168.png
/CyberFiction-Landing-Page/assets/images/male0169.png
/CyberFiction-Landing-Page/assets/images/male0170.png
/CyberFiction-Landing-Page/assets/images/male0171.png
/CyberFiction-Landing-Page/assets/images/male0172.png
/CyberFiction-Landing-Page/assets/images/male0173.png
/CyberFiction-Landing-Page/assets/images/male0174.png
/CyberFiction-Landing-Page/assets/images/male0175.png
/CyberFiction-Landing-Page/assets/images/male0176.png
/CyberFiction-Landing-Page/assets/images/male0177.png
/CyberFiction-Landing-Page/assets/images/male0178.png
/CyberFiction-Landing-Page/assets/images/male0179.png
/CyberFiction-Landing-Page/assets/images/male0180.png
/CyberFiction-Landing-Page/assets/images/male0181.png
/CyberFiction-Landing-Page/assets/images/male0182.png
/CyberFiction-Landing-Page/assets/images/male0183.png
/CyberFiction-Landing-Page/assets/images/male0184.png
/CyberFiction-Landing-Page/assets/images/male0185.png
/CyberFiction-Landing-Page/assets/images/male0186.png
/CyberFiction-Landing-Page/assets/images/male0187.png
/CyberFiction-Landing-Page/assets/images/male0188.png
/CyberFiction-Landing-Page/assets/images/male0189.png
/CyberFiction-Landing-Page/assets/images/male0190.png
/CyberFiction-Landing-Page/assets/images/male0191.png
/CyberFiction-Landing-Page/assets/images/male0192.png
/CyberFiction-Landing-Page/assets/images/male0193.png
/CyberFiction-Landing-Page/assets/images/male0194.png
/CyberFiction-Landing-Page/assets/images/male0195.png
/CyberFiction-Landing-Page/assets/images/male0196.png
/CyberFiction-Landing-Page/assets/images/male0197.png
/CyberFiction-Landing-Page/assets/images/male0198.png
/CyberFiction-Landing-Page/assets/images/male0199.png
/CyberFiction-Landing-Page/assets/images/male0200.png
/CyberFiction-Landing-Page/assets/images/male0201.png
/CyberFiction-Landing-Page/assets/images/male0202.png
/CyberFiction-Landing-Page/assets/images/male0203.png
/CyberFiction-Landing-Page/assets/images/male0204.png
/CyberFiction-Landing-Page/assets/images/male0205.png
/CyberFiction-Landing-Page/assets/images/male0206.png
/CyberFiction-Landing-Page/assets/images/male0207.png
/CyberFiction-Landing-Page/assets/images/male0208.png
/CyberFiction-Landing-Page/assets/images/male0209.png
/CyberFiction-Landing-Page/assets/images/male0210.png
/CyberFiction-Landing-Page/assets/images/male0211.png
/CyberFiction-Landing-Page/assets/images/male0212.png
/CyberFiction-Landing-Page/assets/images/male0213.png
/CyberFiction-Landing-Page/assets/images/male0214.png
/CyberFiction-Landing-Page/assets/images/male0215.png
/CyberFiction-Landing-Page/assets/images/male0216.png
/CyberFiction-Landing-Page/assets/images/male0217.png
/CyberFiction-Landing-Page/assets/images/male0218.png
/CyberFiction-Landing-Page/assets/images/male0219.png
/CyberFiction-Landing-Page/assets/images/male0220.png
/CyberFiction-Landing-Page/assets/images/male0221.png
/CyberFiction-Landing-Page/assets/images/male0222.png
/CyberFiction-Landing-Page/assets/images/male0223.png
/CyberFiction-Landing-Page/assets/images/male0224.png
/CyberFiction-Landing-Page/assets/images/male0225.png
/CyberFiction-Landing-Page/assets/images/male0226.png
/CyberFiction-Landing-Page/assets/images/male0227.png
/CyberFiction-Landing-Page/assets/images/male0228.png
/CyberFiction-Landing-Page/assets/images/male0229.png
/CyberFiction-Landing-Page/assets/images/male0230.png
/CyberFiction-Landing-Page/assets/images/male0231.png
/CyberFiction-Landing-Page/assets/images/male0232.png
/CyberFiction-Landing-Page/assets/images/male0233.png
/CyberFiction-Landing-Page/assets/images/male0234.png
/CyberFiction-Landing-Page/assets/images/male0235.png
/CyberFiction-Landing-Page/assets/images/male0236.png
/CyberFiction-Landing-Page/assets/images/male0237.png
/CyberFiction-Landing-Page/assets/images/male0238.png
/CyberFiction-Landing-Page/assets/images/male0239.png
/CyberFiction-Landing-Page/assets/images/male0240.png
/CyberFiction-Landing-Page/assets/images/male0241.png
/CyberFiction-Landing-Page/assets/images/male0242.png
/CyberFiction-Landing-Page/assets/images/male0243.png
/CyberFiction-Landing-Page/assets/images/male0244.png
/CyberFiction-Landing-Page/assets/images/male0245.png
/CyberFiction-Landing-Page/assets/images/male0246.png
/CyberFiction-Landing-Page/assets/images/male0247.png
/CyberFiction-Landing-Page/assets/images/male0248.png
/CyberFiction-Landing-Page/assets/images/male0249.png
/CyberFiction-Landing-Page/assets/images/male0250.png
/CyberFiction-Landing-Page/assets/images/male0251.png
/CyberFiction-Landing-Page/assets/images/male0252.png
/CyberFiction-Landing-Page/assets/images/male0253.png
/CyberFiction-Landing-Page/assets/images/male0254.png
/CyberFiction-Landing-Page/assets/images/male0255.png
/CyberFiction-Landing-Page/assets/images/male0256.png
/CyberFiction-Landing-Page/assets/images/male0257.png
/CyberFiction-Landing-Page/assets/images/male0258.png
/CyberFiction-Landing-Page/assets/images/male0259.png
/CyberFiction-Landing-Page/assets/images/male0260.png
/CyberFiction-Landing-Page/assets/images/male0261.png
/CyberFiction-Landing-Page/assets/images/male0262.png
/CyberFiction-Landing-Page/assets/images/male0263.png
/CyberFiction-Landing-Page/assets/images/male0264.png
/CyberFiction-Landing-Page/assets/images/male0265.png
/CyberFiction-Landing-Page/assets/images/male0266.png
/CyberFiction-Landing-Page/assets/images/male0267.png
/CyberFiction-Landing-Page/assets/images/male0268.png
/CyberFiction-Landing-Page/assets/images/male0269.png
/CyberFiction-Landing-Page/assets/images/male0270.png
/CyberFiction-Landing-Page/assets/images/male0271.png
/CyberFiction-Landing-Page/assets/images/male0272.png
/CyberFiction-Landing-Page/assets/images/male0273.png
/CyberFiction-Landing-Page/assets/images/male0274.png
/CyberFiction-Landing-Page/assets/images/male0275.png
/CyberFiction-Landing-Page/assets/images/male0276.png
/CyberFiction-Landing-Page/assets/images/male0277.png
/CyberFiction-Landing-Page/assets/images/male0278.png
/CyberFiction-Landing-Page/assets/images/male0279.png
/CyberFiction-Landing-Page/assets/images/male0280.png
/CyberFiction-Landing-Page/assets/images/male0281.png
/CyberFiction-Landing-Page/assets/images/male0282.png
/CyberFiction-Landing-Page/assets/images/male0283.png
/CyberFiction-Landing-Page/assets/images/male0284.png
/CyberFiction-Landing-Page/assets/images/male0285.png
/CyberFiction-Landing-Page/assets/images/male0286.png
/CyberFiction-Landing-Page/assets/images/male0287.png
/CyberFiction-Landing-Page/assets/images/male0288.png
/CyberFiction-Landing-Page/assets/images/male0289.png
/CyberFiction-Landing-Page/assets/images/male0290.png
/CyberFiction-Landing-Page/assets/images/male0291.png
/CyberFiction-Landing-Page/assets/images/male0292.png
/CyberFiction-Landing-Page/assets/images/male0293.png
/CyberFiction-Landing-Page/assets/images/male0294.png
/CyberFiction-Landing-Page/assets/images/male0295.png
/CyberFiction-Landing-Page/assets/images/male0296.png
/CyberFiction-Landing-Page/assets/images/male0297.png
/CyberFiction-Landing-Page/assets/images/male0298.png
/CyberFiction-Landing-Page/assets/images/male0299.png
/CyberFiction-Landing-Page/assets/images/male0300.png
    `;
    return data.split("\n")[index].trim();
}

const frameCount = 300;
const images = [];
const imageSeq = { frame: 1 };

for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = files(i);
    images.push(img);
}

gsap.to(imageSeq, {
    frame: frameCount - 1,
    snap: "frame",
    ease: 'none',
    scrollTrigger: {
        scrub: 0.15,
        trigger: '.page-1>canvas',
        start: 'top top',
        end: '600% top',
        scroller: '#main',
    },
    onUpdate: render,
});

images[0].onload = render;

function render() {
    scaleImage(images[imageSeq.frame], context);
}

function scaleImage(img, ctx) {
    const canvas = ctx.canvas;
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.max(hRatio, vRatio);
    const centerShift_x = (canvas.width - img.width * ratio) / 2;
    const centerShift_y = (canvas.height - img.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        centerShift_x,
        centerShift_y,
        img.width * ratio,
        img.height * ratio
    );
}

// Force initial render
window.addEventListener('load', () => {
    if (images[0].complete) {
        render();
    } else {
        images[0].onload = render;
    }
});

ScrollTrigger.create({
    trigger: ".page-1>canvas",
    pin: true,
    scroller: '#main',
    start: 'top top',
    end: '600% top',
});

gsap.to(".page-2", {
    scrollTrigger: {
        trigger: '.page-2',
        start: 'top top',
        end: 'bottom top',
        pin: true,
        scroller: '#main'
    }
});
gsap.to(".page-3", {
    scrollTrigger: {
        trigger: '.page-3',
        start: 'top top',
        end: 'bottom top',
        pin: true,
        scroller: '#main'
    }
});
gsap.to(".page-4", {
    scrollTrigger: {
        trigger: '.page-4',
        start: 'top top',
        end: 'bottom top',
        pin: true,
        scroller: '#main'
    }
});
