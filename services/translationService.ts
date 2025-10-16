// This is a simulated translation service for the purpose of this exercise.
// In a real-world application, this would likely involve a more sophisticated
// NLP model or a third-party translation API.

const dictionary: Record<string, string> = {
    "CLOSE UP on char_luna_01's face, her emerald green eyes are wide with terror and glistening with tears, p...": "Cận cảnh khuôn mặt char_luna_01, đôi mắt xanh lục rực rỡ mở to kinh hoàng và long lanh nước mắt, đồng tử giãn rộng...",
    "Extreme whip pan downwards, blurring the forest and revealing a dark, deep pit with char_mit_01, a tiny go...": "Cú lia máy cực nhanh xuống dưới, làm mờ khu rừng và để lộ ra một cái hố sâu, tối tăm với char_mit_01, một chú mèo con nhỏ...",
    "An idyllic shot of char_mit_01, a tiny golden kitten, playfully chasing char_prop_butterjumps and fly_01, ...": "Một cảnh quay bình dị của char_mit_01, một chú mèo con nhỏ màu vàng, đang tinh nghịch đuổi theo những con bướm và bay...",
    "char_luna_01, a calico cat, lies gracefully on a sun-warmed mossy rock in a secret garden,...": "char_luna_01, một con mèo tam thể, nằm duyên dáng trên tảng đá phủ rêu ấm áp dưới nắng trong một khu vườn bí mật,...",
    "char_luna_01 gently uses her paw to nudge char_mit_01 away from a dense, thorny bush in a s...": "char_luna_01 nhẹ nhàng dùng chân của mình để đẩy char_mit_01 ra khỏi một bụi gai rậm rạp...",
    "CLOSE UP of char_luna_01 licking char_mit_01's golden fur with immense tenderness. char_mit...": "Cận cảnh char_luna_01 đang liếm bộ lông vàng óng của char_mit_01 với sự dịu dàng vô hạn. char_mit...",
    "char_mit_01, a tiny golden kitten, excitedly chases a iridescent dragonjumps and fly, darti...": "char_mit_01, một chú mèo con nhỏ màu vàng, hào hứng đuổi theo những con chuồn chuồn lấp lánh và bay, lao đi...",
    "flies through the air": "bay trên không",
    "gently nudges away": "nhẹ nhàng đẩy ra",
    "emerald green eyes": "đôi mắt xanh lục",
    "with terror": "kinh hoàng",
    "dense thorny bush": "bụi gai dày đặc",
    "secret garden": "khu vườn bí mật",
    "looks annoyed": "trông khó chịu",
    "fur is slick": "bộ lông bóng mượt"
};

export const translatePrompt = (prompt: string): string => {
    let finalPrompt = prompt;

    // Sort keys by length, longest first, to ensure more specific phrases are replaced before shorter ones.
    const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        // Use a case-insensitive regex to find and replace the English phrase.
        if (finalPrompt.toLowerCase().includes(key.toLowerCase())) {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            finalPrompt = finalPrompt.replace(regex, dictionary[key]);
        }
    }

    return finalPrompt;
};
