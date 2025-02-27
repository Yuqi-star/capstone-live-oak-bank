// static/chart.js
const ctx = document.getElementById('sentimentChart').getContext('2d');

// Prepare data for the chart
const labels = [];
const sentimentScores = [];

// Loop through the news data to populate labels and sentiment scores
{% for item in news %}
labels.push("{{ item['title'] }}");
sentimentScores.push({{ item['sentiment_score'] }});
{% endfor %}

// Create and configure the chart
const sentimentChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [{
            label: 'Sentiment Score',
            data: sentimentScores,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Sentiment Score'
                }
            }
        }
    }
});
