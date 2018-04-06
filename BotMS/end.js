const random = array => { return array[Math.floor(Math.random() * array.length)] }

const getEnds = () => {
  const answers = [
    'I am happy to help you today',
    'If you want anything else, just tell me',
    'Goodbye! Have a good one',
    'Enjoy your day with a smile',
    'It is my pleasure to help you. Enjoy your day.'
  ]
  return random(answers)
}

module.exports = getEnds