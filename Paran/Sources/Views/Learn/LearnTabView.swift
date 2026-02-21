import SwiftUI

struct LearnTabView: View {
    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    Text("Learn")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(ParanTheme.textPrimary)
                        .padding(.top, 60)

                    LearnCard(
                        title: "What is Astrocartography?",
                        description: "How your birth chart maps to locations around the world.",
                        icon: "globe"
                    )

                    LearnCard(
                        title: "Understanding Your Lines",
                        description: "MC, IC, ASC, DSC — what each line type means for you.",
                        icon: "line.diagonal"
                    )

                    LearnCard(
                        title: "The Three Layers",
                        description: "Natal chart, relocated chart, and transits — how they combine.",
                        icon: "square.3.layers.3d"
                    )

                    LearnCard(
                        title: "Reading City Cards",
                        description: "How to interpret the synthesis paragraph and strength %.",
                        icon: "doc.text"
                    )

                    LearnCard(
                        title: "Cosmic Timing",
                        description: "Transits and how planetary movements create windows of opportunity.",
                        icon: "clock"
                    )

                    LearnCard(
                        title: "Bonds & Synastry",
                        description: "How to use shared charts for travel and living decisions.",
                        icon: "heart.circle"
                    )
                }
                .padding(.horizontal)
                .padding(.bottom, 100)
            }
        }
    }
}

struct LearnCard: View {
    let title: String
    let description: String
    let icon: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 22))
                .foregroundStyle(ParanTheme.accent)
                .frame(width: 44, height: 44)
                .background(ParanTheme.accent.opacity(0.15), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(ParanTheme.textPrimary)
                Text(description)
                    .font(.system(size: 13))
                    .foregroundStyle(ParanTheme.textSecondary)
                    .lineLimit(2)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundStyle(ParanTheme.textMuted)
        }
        .padding(14)
        .background(ParanTheme.cardGradient, in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(ParanTheme.cardBorder, lineWidth: 1)
        }
    }
}
